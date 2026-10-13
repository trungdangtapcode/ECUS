import asyncio
import json
import stat
from pathlib import Path
from uuid import UUID, uuid4

import httpx
import pytest
from pydantic import BaseModel

from ecus_api.ai import tracing
from ecus_api.ai.openai_compatible import OpenAICompatible
from ecus_api.core.config import Settings
from ecus_api.core.errors import AppError


class Result(BaseModel):
    value: str


def response(value: str = "synthetic") -> httpx.Response:
    return httpx.Response(
        200,
        headers={"x-request-id": "req-synthetic"},
        json={
            "model": "test-model",
            "usage": {"total_tokens": 12},
            "choices": [
                {"finish_reason": "stop", "message": {"content": json.dumps({"value": value})}}
            ],
        },
    )


async def test_trace_preserves_wire_body_validation_and_case_scope(settings: Settings) -> None:
    settings.ai_trace_enabled = True
    case, job, doc = uuid4(), uuid4(), uuid4()
    sent = {}

    def respond(request: httpx.Request) -> httpx.Response:
        sent.update(json.loads(request.content))
        return response()

    async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
        with tracing.scope(
            case_id=case,
            job_id=job,
            document_id=doc,
            phase="extraction",
            fields=["value"],
            pages=[1],
        ):
            result = await OpenAICompatible(settings, client).extract_document(
                "synthetic input", Result
            )
    assert result.trace_id is not None
    tracing.annotate(settings, case, result.trace_id, [{"field": "value", "status": "accepted"}])
    record = json.loads(tracing.content(settings, case, UUID(result.trace_id)))
    assert record["request"]["body"] == sent
    assert record["response"]["choices"][0]["message"]["content"] == '{"value": "synthetic"}'
    assert record["summary"]["provider_request_id"] == "req-synthetic"
    assert record["summary"]["job_id"] == str(job)
    assert record["summary"]["validation"][0]["status"] == "accepted"
    assert "Authorization" not in record["request"]
    path = tracing.directory(settings, case) / f"{result.trace_id}.json"
    assert stat.S_IMODE(path.stat().st_mode) == 0o600
    with pytest.raises(AppError) as error:
        tracing.content(settings, uuid4(), UUID(result.trace_id))
    assert error.value.code == "ai_trace_not_found"


@pytest.mark.parametrize(
    "kind,code",
    [
        ("timeout", "ai_timeout"),
        ("http", "ai_unavailable"),
        ("schema", "ai_invalid_output"),
        ("refusal", "ai_refused"),
        ("json", "ai_invalid_output"),
    ],
)
async def test_failed_calls_are_logged_without_leaking_credentials(
    settings: Settings, kind: str, code: str
) -> None:
    settings.ai_trace_enabled = True
    case = uuid4()

    def respond(request: httpx.Request) -> httpx.Response:
        if kind == "timeout":
            raise httpx.ReadTimeout("private details", request=request)
        if kind == "http":
            return httpx.Response(429, json={"api_key": "test-key", "error": "test-key"})
        if kind == "json":
            return httpx.Response(200, text="not JSON test-key")
        return httpx.Response(
            200,
            json={
                "model": "test-model",
                "choices": [
                    {
                        "finish_reason": "stop",
                        "message": {"refusal": "test-key"}
                        if kind == "refusal"
                        else {"content": "{}"},
                    }
                ],
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
        with tracing.scope(case_id=case):
            with pytest.raises(AppError) as error:
                await OpenAICompatible(settings, client).extract_document("synthetic input", Result)
    assert error.value.code == code
    entries = tracing.summaries(settings, case)
    assert len(entries) == 1
    assert entries[0]["status"] == "failed"
    assert entries[0]["error_code"] == code
    content = tracing.content(settings, case, UUID(entries[0]["id"])).decode()
    assert "test-key" not in content
    assert "private details" not in content


async def test_async_contexts_do_not_mix_cases(settings: Settings) -> None:
    settings.ai_trace_enabled = True
    cases = [uuid4(), uuid4()]

    async def respond(_: httpx.Request) -> httpx.Response:
        await asyncio.sleep(0)
        return response()

    async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
        provider = OpenAICompatible(settings, client)

        async def call(case: UUID) -> None:
            with tracing.scope(case_id=case, fields=[str(case)]):
                await provider.extract_document(str(case), Result)

        await asyncio.gather(*(call(case) for case in cases))
    for case in cases:
        entries = tracing.summaries(settings, case)
        assert len(entries) == 1
        assert entries[0]["fields"] == [str(case)]
        assert str(case) in tracing.content(settings, case, UUID(entries[0]["id"])).decode()
    assert not tracing.directory(settings, None).exists()


async def test_disabled_logging_and_storage_failure(settings: Settings, tmp_path: Path) -> None:
    async with httpx.AsyncClient(transport=httpx.MockTransport(lambda _: response())) as client:
        result = await OpenAICompatible(settings, client).extract_document("synthetic", Result)
        assert result.trace_id is None
        assert not tracing.directory(settings, None).exists()
        settings.ai_trace_enabled = True
        root = tmp_path / "not-a-directory"
        root.write_text("synthetic")
        settings.ai_trace_root = root
        with pytest.raises(AppError) as error:
            await OpenAICompatible(settings, client).extract_document("synthetic", Result)
        assert error.value.code == "ai_trace_unavailable"


async def test_trace_routes_are_paginated_and_case_scoped(
    client: httpx.AsyncClient, settings: Settings
) -> None:
    settings.ai_trace_enabled = True
    created = await client.post(
        "/api/v1/cases", json={"reference": "TRACE-TEST", "title": "Synthetic", "procedure": "TEST"}
    )
    case = UUID(created.json()["id"])
    ids = []
    for _ in range(2):
        with tracing.scope(case_id=case, phase="extraction"):
            entry = tracing.begin(
                settings,
                "https://provider.example/v1/chat/completions",
                {"model": "test-model", "messages": []},
            )
        assert entry is not None
        tracing.finish(settings, entry, body={"synthetic": True}, http_status=200)
        ids.append(entry["id"])
    root = f"/api/v1/cases/{case}/review/ai-traces"
    listing = await client.get(root, params={"limit": 1, "offset": 1})
    assert listing.status_code == 200
    assert listing.json()["total"] == 2
    assert len(listing.json()["items"]) == 1
    download = await client.get(f"{root}/{ids[0]}/content")
    assert download.json()["response"] == {"synthetic": True}
    assert download.headers["cache-control"] == "no-store"
    assert (await client.get(f"{root}/{uuid4()}/content")).status_code == 404
    assert (
        await client.get(f"/api/v1/cases/{uuid4()}/review/ai-traces/{ids[0]}/content")
    ).status_code == 404
