"""Synthetic evidence and mocked providers only; no customer data or paid requests."""

import asyncio
from uuid import uuid4

import httpx
import pytest
from test_review import new_case, pdf_bytes, upload

from ecus_api.ai.contracts import AIResult
from ecus_api.ai.openai_compatible import OpenAICompatible
from ecus_api.core.errors import AppError
from ecus_api.modules.review.domain import evaluate
from ecus_api.modules.review.policy import ReviewPolicy
from ecus_api.modules.review.schemas import (
    Applicability,
    Document,
    LogicalDocument,
    Workspace,
)


async def source(client: httpx.AsyncClient) -> tuple[str, dict]:
    root = await new_case(client)
    result = await client.post(
        f"{root}/documents",
        json=upload(pdf_bytes(["Invoice", "21,000", "22,000"]), "source.pdf", 0),
    )
    assert result.status_code == 200
    return root, result.json()["workspace"]


def observation(state: dict, quote: str = "21,000") -> dict:
    return dict(
        revision=state["revision"],
        field="weight",
        document_id=state["documents"][0]["id"],
        document_type="INVOICE",
        page=1,
        quote=quote,
        value_type="decimal",
        unit="KG",
        verified=True,
    )


async def test_correction_retains_evidence_and_forces_reverification(
    client: httpx.AsyncClient,
) -> None:
    root, state = await source(client)
    state = (await client.post(f"{root}/observations", json=observation(state))).json()["workspace"]
    old = state["observations"][0]
    state = (
        await client.post(
            f"{root}/fields/weight/selection",
            json=dict(revision=state["revision"], observation_id=old["id"], reason="Checked"),
        )
    ).json()["workspace"]
    invalid = await client.post(
        f"{root}/observations/{old['id']}/correct",
        json={**observation(state, "missing"), "reason": "Correction"},
    )
    assert invalid.status_code == 422
    assert (await client.get(root)).json()["workspace"] == state
    result = await client.post(
        f"{root}/observations/{old['id']}/correct",
        json={**observation(state, "22,000"), "reason": "Read revised value"},
    )
    assert result.status_code == 200, result.text
    state = result.json()["workspace"]
    assert state["observations"][0]["quote"] == "21,000"
    assert state["observations"][0]["state"] == "superseded"
    corrected = state["observations"][1]
    assert not corrected["verified"]
    assert not state["selections"]
    assert state["observations"][0]["replacement_id"] == corrected["id"]
    assert result.json()["readiness"]["comparisons"][0]["status"] == "EXTRACTION_UNCERTAIN"
    assert (
        await client.post(
            f"{root}/observations/{old['id']}/verify",
            json=dict(revision=state["revision"], reason="Cannot revive retired evidence"),
        )
    ).status_code == 404
    result = await client.post(
        f"{root}/observations/{corrected['id']}/withdraw",
        json=dict(revision=state["revision"], reason="Duplicate source"),
    )
    assert not result.json()["readiness"]["comparisons"]


async def test_document_replacement_preserves_original_and_retires_values(
    client: httpx.AsyncClient,
) -> None:
    root, state = await source(client)
    state = (await client.post(f"{root}/observations", json=observation(state))).json()["workspace"]
    doc = state["documents"][0]
    original = (await client.get(f"{root}/documents/{doc['id']}/content")).content
    bad = await client.post(
        f"{root}/documents/{doc['id']}/replace",
        json={**upload(b"not a PDF", "bad.pdf", state["revision"]), "reason": "New version"},
    )
    assert bad.status_code == 422
    assert (await client.get(root)).json()["workspace"] == state
    result = await client.post(
        f"{root}/documents/{doc['id']}/replace",
        json={
            **upload(pdf_bytes(["Revised", "23,000"]), "revision.pdf", state["revision"]),
            "reason": "Supplier correction",
        },
    )
    assert result.status_code == 200
    state = result.json()["workspace"]
    assert state["documents"][0]["withdrawn"]
    assert state["documents"][0]["replaced_by"] == state["documents"][1]["id"]
    assert state["observations"][0]["state"] == "withdrawn"
    assert (await client.get(f"{root}/documents/{doc['id']}/content")).content == original
    assert (await client.post(f"{root}/observations", json=observation(state))).status_code == 422


def policy() -> dict:
    return dict(
        version="rules-v1",
        name="Synthetic rules",
        status="project_baseline",
        fields=[
            dict(
                field="weight",
                label="Weight",
                value_type="decimal",
                unit="KG",
                preferred_sources=["INVOICE"],
            )
        ],
        document_requirements=[
            dict(key="invoice", label="Invoice", any_of=["INVOICE"]),
            dict(key="transport", label="Transport", any_of=["BILL_OF_LADING", "SEA_WAYBILL"]),
            dict(
                key="arrival", label="Arrival", any_of=["ARRIVAL_NOTICE"], when="arrival_confirmed"
            ),
            dict(key="origin", label="Origin", any_of=["CO"], when="applicable"),
        ],
    )


async def test_versioned_rules_and_logical_documents(client: httpx.AsyncClient) -> None:
    root, state = await source(client)
    data = dict(revision=state["revision"], reason="Confirmed configuration", policy=policy())
    result = await client.post(f"{root}/policy", json=data)
    assert result.status_code == 200
    assert "origin:applicability_unknown" in result.json()["readiness"]["blockers"]
    state = result.json()["workspace"]
    changed = {**policy(), "name": "Changed under same version"}
    assert (
        await client.post(
            f"{root}/policy", json={**data, "revision": state["revision"], "policy": changed}
        )
    ).status_code == 409
    assert (
        await client.post(
            f"{root}/policy",
            json={
                **data,
                "revision": state["revision"],
                "policy": {**policy(), "version": "v2", "procedures": ["OTHER"]},
            },
        )
    ).status_code == 422
    for kind in ["INVOICE", "SEA_WAYBILL"]:
        result = await client.post(
            f"{root}/logical-documents",
            json=dict(
                revision=state["revision"],
                reason="Read pages",
                document_id=state["documents"][0]["id"],
                document_type=kind,
                page_from=1,
                page_to=1,
            ),
        )
        assert result.status_code == 200
        state = result.json()["workspace"]
    assert "transport:logical_document_missing" not in result.json()["readiness"]["blockers"]
    result = await client.post(
        f"{root}/applicability/origin",
        json=dict(
            revision=state["revision"],
            reason="Not applicable to this shipment",
            status="not_applicable",
        ),
    )
    state = result.json()["workspace"]
    assert "origin:applicability_unknown" not in result.json()["readiness"]["blockers"]
    result = await client.post(
        f"{root}/stage",
        json=dict(
            revision=state["revision"], reason="Arrival confirmed", stage="arrival_confirmed"
        ),
    )
    state = result.json()["workspace"]
    assert "arrival:logical_document_missing" in result.json()["readiness"]["blockers"]
    logical = state["logical_documents"][1]
    result = await client.post(
        f"{root}/logical-documents/{logical['id']}/withdraw",
        json=dict(revision=state["revision"], reason="Misclassified"),
    )
    assert "transport:logical_document_missing" in result.json()["readiness"]["blockers"]


@pytest.mark.parametrize("transport", ["BILL_OF_LADING", "SEA_WAYBILL"])
def test_combined_file_alternative_transport_and_conditional_gate(transport: str) -> None:
    doc = Document(
        id=uuid4(), filename="combined.pdf", storage_key="test", pages=["one", "two", "three"]
    )
    state = Workspace(documents=[doc], policy=ReviewPolicy.model_validate(policy()))
    for page, kind in enumerate(["INVOICE", transport], 1):
        state.logical_documents.append(
            LogicalDocument(
                id=uuid4(),
                document_id=doc.id,
                document_type=kind,
                page_from=page,
                page_to=page,
                reason="Checked",
            )
        )
    blockers = evaluate(state).blockers
    assert "transport:logical_document_missing" not in blockers
    assert "arrival:logical_document_missing" not in blockers
    assert "origin:applicability_unknown" in blockers
    state.applicability["origin"] = Applicability(status="applicable", reason="Reviewer confirmed")
    state.stage = "arrival_confirmed"
    blockers = evaluate(state).blockers
    assert "origin:logical_document_missing" in blockers
    assert "arrival:logical_document_missing" in blockers


async def wait_for_job(client: httpx.AsyncClient, root: str) -> dict:
    async with asyncio.timeout(5):
        while True:
            job = (await client.get(f"{root}/extractions")).json()[0]
            if job["status"] not in {"pending", "running"}:
                return job
            await asyncio.sleep(0.01)


async def test_ai_proposals_validate_sources_deduplicate_and_require_import(
    client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls = []
    release = asyncio.Event()

    async def fake(self, text, schema, **kwargs):
        calls.append(text)
        await release.wait()
        base = dict(
            field="weight",
            document_type="INVOICE",
            page=1,
            unit="KG",
            number_locale="en",
            confidence=0.99,
        )
        return AIResult(
            value=schema.model_validate(
                {
                    "fields": [
                        {**base, "quote": "21,000"},
                        {**base, "quote": "made up"},
                        {**base, "quote": "22,000", "field": "unrequested"},
                    ]
                }
            ),
            model="test-model",
            usage={},
            request_id="synthetic",
            prompt_version="test-v1",
        )

    monkeypatch.setattr(OpenAICompatible, "extract_document", fake)
    root, state = await source(client)
    payload = dict(
        revision=state["revision"],
        document_id=state["documents"][0]["id"],
        fields=policy()["fields"],
    )
    results = await asyncio.gather(
        client.post(f"{root}/extractions", json=payload),
        client.post(f"{root}/extractions", json=payload),
    )
    assert [response.status_code for response in results] == [202, 202]
    assert results[0].json()["id"] == results[1].json()["id"]
    release.set()
    job = await wait_for_job(client, root)
    assert job["status"] == "succeeded", job
    assert len(calls) == 1 and job["accepted_count"] == 1 and job["rejected_count"] == 2
    assert not (await client.get(root)).json()["workspace"]["observations"]
    other = await new_case(client)
    assert (
        await client.post(f"{other}/extractions/{job['id']}/apply", json={"revision": 0})
    ).status_code == 404
    result = await client.post(
        f"{root}/extractions/{job['id']}/apply", json={"revision": state["revision"]}
    )
    assert result.status_code == 200, result.text
    state = result.json()["workspace"]
    value = state["observations"][0]
    assert value["origin"] == "ai" and not value["verified"]
    assert value["extraction_confidence"] == 0.99
    assert value["extraction_run_id"] == job["id"]
    assert (
        await client.post(
            f"{root}/extractions/{job['id']}/apply", json={"revision": state["revision"]}
        )
    ).json()["error"]["code"] == "extraction_already_applied"


async def test_ai_result_cannot_apply_after_revision_changes(
    client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake(self, text, schema, **kwargs):
        return AIResult(
            value=schema.model_validate(
                {
                    "fields": [
                        dict(
                            field="weight",
                            document_type="INVOICE",
                            page=1,
                            quote="21,000",
                            unit="KG",
                            number_locale="en",
                            confidence=1,
                        )
                    ]
                }
            ),
            model="test",
            usage={},
            request_id=None,
            prompt_version="test-v1",
        )

    monkeypatch.setattr(OpenAICompatible, "extract_document", fake)
    root, state = await source(client)
    await client.post(
        f"{root}/extractions",
        json=dict(
            revision=state["revision"],
            document_id=state["documents"][0]["id"],
            fields=policy()["fields"],
        ),
    )
    job = await wait_for_job(client, root)
    state = (await client.post(f"{root}/observations", json=observation(state, "22,000"))).json()[
        "workspace"
    ]
    result = await client.post(
        f"{root}/extractions/{job['id']}/apply", json={"revision": state["revision"]}
    )
    assert result.status_code == 409
    assert (await client.get(root)).json()["workspace"] == state


async def test_scan_rejected_before_provider_call(
    client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def forbidden(*args, **kwargs):
        pytest.fail("Image-only sources must not trigger a paid text extraction")

    monkeypatch.setattr(OpenAICompatible, "extract_document", forbidden)
    root = await new_case(client)
    state = (
        await client.post(f"{root}/documents", json=upload(pdf_bytes([]), "scan.pdf", 0))
    ).json()["workspace"]
    result = await client.post(
        f"{root}/extractions",
        json=dict(
            revision=state["revision"],
            document_id=state["documents"][0]["id"],
            fields=policy()["fields"],
        ),
    )
    assert result.status_code == 422
    assert result.json()["error"]["code"] == "ocr_required"
    assert (await client.get(f"{root}/extractions")).json() == []


def test_policy_is_required_and_field_mapping_cannot_bypass_requirements() -> None:
    from ecus_api.modules.review.schemas import Mapping, Template

    state = Workspace()
    assert "policy_missing" in evaluate(state).blockers
    state.policy = ReviewPolicy.model_validate(policy())
    state.template = Template(
        filename="test.xlsx",
        storage_key="test",
        version="v1",
        mapping_version="m1",
        mappings=[Mapping(field="other", sheet="Sheet", cell="A1")],
    )
    assert "weight:template_mapping_missing" in evaluate(state).blockers
    state.policy.status = "proposal"
    assert "policy_proposal" in evaluate(state).blockers


async def test_source_preference_and_classification_gate(client: httpx.AsyncClient) -> None:
    root, state = await source(client)
    state = (
        await client.post(
            f"{root}/policy", json=dict(revision=state["revision"], reason="Rules", policy=policy())
        )
    ).json()["workspace"]
    state = (
        await client.post(
            f"{root}/observations", json={**observation(state), "document_type": "PACKING_LIST"}
        )
    ).json()["workspace"]
    result = await client.post(
        f"{root}/fields/weight/selection",
        json=dict(
            revision=state["revision"],
            observation_id=state["observations"][0]["id"],
            reason="Selected source",
        ),
    )
    assert "weight:source_exception_requires_review" in result.json()["readiness"]["blockers"]
    assert "weight:source_classification_required" in result.json()["readiness"]["blockers"]


async def test_extraction_retry_is_explicit_scoped_and_uses_current_revision(
    client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls = []

    async def fail(self, text, schema, **kwargs):
        calls.append(text)
        raise AppError("ai_unavailable", "Synthetic provider failure", 503)

    monkeypatch.setattr(OpenAICompatible, "extract_document", fail)
    root, state = await source(client)
    response = await client.post(
        f"{root}/extractions",
        json={
            "revision": state["revision"],
            "document_id": state["documents"][0]["id"],
            "fields": policy()["fields"],
        },
    )
    assert response.status_code == 202
    job = await wait_for_job(client, root)
    assert job["status"] == "failed" and len(calls) == 1
    other = await new_case(client)
    assert (
        await client.post(f"{other}/extractions/{job['id']}/retry", json={"revision": 0})
    ).status_code == 404
    response = await client.post(
        f"{root}/stage",
        json={
            "revision": state["revision"],
            "stage": "arrival_confirmed",
            "reason": "Synthetic stage change",
        },
    )
    state = response.json()["workspace"]
    response = await client.post(
        f"{root}/extractions/{job['id']}/retry", json={"revision": state["revision"]}
    )
    assert response.status_code == 202 and response.json()["id"] != job["id"]
    retried = await wait_for_job(client, root)
    assert retried["source_revision"] == state["revision"] and len(calls) == 2
    assert not (await client.get(root)).json()["workspace"]["observations"]
