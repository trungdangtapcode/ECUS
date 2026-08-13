import json

import httpx
import pytest
from pydantic import BaseModel, ConfigDict

from ecus_api.ai.contracts import ImageInput
from ecus_api.ai.openai_compatible import OpenAICompatible
from ecus_api.core.config import Settings
from ecus_api.core.errors import AppError


class Invoice(BaseModel):
    model_config = ConfigDict(extra="forbid")
    invoice_number: str
    quantity: int


async def test_compatible_endpoint_schema_and_response_validation(settings: Settings) -> None:
    def respond(request: httpx.Request) -> httpx.Response:
        assert str(request.url) == "https://provider.example/v1/chat/completions"
        assert request.headers["Authorization"] == "Bearer test-key"
        body = json.loads(request.content)
        assert body["model"] == "test-model"
        assert body["response_format"]["json_schema"]["strict"] is True
        assert body["messages"][1]["content"][1]["image_url"]["url"].startswith("data:image/png;")
        return httpx.Response(
            200,
            json={
                "model": "test-model",
                "usage": {"total_tokens": 30},
                "choices": [
                    {
                        "finish_reason": "stop",
                        "message": {
                            "content": json.dumps({"invoice_number": "INV-01", "quantity": 42})
                        },
                    }
                ],
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
        result = await OpenAICompatible(settings, client).extract_document(
            "source page 1", Invoice, images=(ImageInput(b"image-fixture", "image/png"),)
        )
    assert result.value.quantity == 42
    assert result.usage["total_tokens"] == 30


@pytest.mark.parametrize(
    ("message", "finish", "code"),
    [
        ({"content": "invalid JSON"}, "stop", "ai_invalid_output"),
        ({"content": '{"invoice_number":"INV"}'}, "stop", "ai_invalid_output"),
        ({"refusal": "provider-specific secret text"}, "stop", "ai_refused"),
        ({"content": "{}"}, "length", "ai_incomplete"),
    ],
)
async def test_unusable_ai_output_is_not_silently_saved(
    settings: Settings, message: dict[str, str], finish: str, code: str
) -> None:
    transport = httpx.MockTransport(
        lambda _: httpx.Response(
            200,
            json={
                "model": "test-model",
                "choices": [{"finish_reason": finish, "message": message}],
            },
        )
    )
    async with httpx.AsyncClient(transport=transport) as client:
        with pytest.raises(AppError) as error:
            await OpenAICompatible(settings, client).extract_document("sample", Invoice)
    assert error.value.code == code
    assert "provider-specific" not in str(error.value)


async def test_capability_gate_and_timeout(settings: Settings) -> None:
    calls = 0

    def timeout(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        raise httpx.ReadTimeout("secret provider details", request=request)

    settings.ai_supports_vision = False
    async with httpx.AsyncClient(transport=httpx.MockTransport(timeout)) as client:
        provider = OpenAICompatible(settings, client)
        with pytest.raises(AppError, match="does not support"):
            await provider.extract_document(
                "image", Invoice, images=(ImageInput(b"x", "image/png"),)
            )
        assert calls == 0
        with pytest.raises(AppError) as error:
            await provider.extract_document("sample", Invoice)
        assert error.value.code == "ai_timeout"
        assert calls == 1  # No hidden paid retry.


async def test_json_mode_still_validates_schema(settings: Settings) -> None:
    settings.ai_output_mode = "json_object"

    def respond(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert body["response_format"] == {"type": "json_object"}
        return httpx.Response(
            200,
            json={
                "model": "local-model",
                "choices": [
                    {"finish_reason": "stop", "message": {"content": '{"unexpected":"field"}'}}
                ],
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
        with pytest.raises(AppError) as error:
            await OpenAICompatible(settings, client).extract_document("sample", Invoice)
        assert error.value.code == "ai_invalid_output"


@pytest.mark.parametrize("status", [403, 404])
async def test_model_access_error_has_stable_code_without_provider_details(
    settings: Settings, status: int
) -> None:
    transport = httpx.MockTransport(
        lambda _: httpx.Response(
            status,
            json={"error": {"code": "model_not_found", "message": "Private provider details"}},
        )
    )
    async with httpx.AsyncClient(transport=transport) as client:
        with pytest.raises(AppError) as error:
            await OpenAICompatible(settings, client).extract_document("Synthetic invoice", Invoice)
    assert error.value.code == "ai_model_unavailable"
    assert "Private provider details" not in str(error.value)
