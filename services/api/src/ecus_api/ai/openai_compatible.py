"""Chat Completions transport; no provider SDK types escape this module."""

import asyncio
import base64
import json
from importlib.resources import files
from typing import Any
from urllib.parse import urlsplit

import httpx
from pydantic import BaseModel, ValidationError

from ecus_api.ai import tracing
from ecus_api.ai.contracts import AIResult, ImageInput, T
from ecus_api.core.config import Settings
from ecus_api.core.errors import AppError


def strict_schema(schema: dict[str, Any]) -> dict[str, Any]:
    """Require explicit values (including null) and reject extra object fields."""
    result = {key: value for key, value in schema.items() if key != "default"}
    # Property names are data, not schema keywords (a field may be named "default").
    for key in ("properties", "$defs"):
        if isinstance(result.get(key), dict):
            result[key] = {name: strict_schema(value) for name, value in result[key].items()}
    if isinstance(result.get("items"), dict):
        result["items"] = strict_schema(result["items"])
    for key in ("anyOf", "allOf", "oneOf", "prefixItems"):
        if isinstance(result.get(key), list):
            result[key] = [strict_schema(value) for value in result[key]]
    if result.get("type") == "object":
        result["additionalProperties"] = False
        result["required"] = list(result.get("properties", {}))
    return result


class _Message(BaseModel):
    content: str | None = None
    refusal: str | None = None


class _Choice(BaseModel):
    finish_reason: str
    message: _Message


class _Completion(BaseModel):
    choices: list[_Choice]
    model: str
    usage: dict[str, Any] | None = None


class OpenAICompatible:
    def __init__(self, settings: Settings, client: httpx.AsyncClient) -> None:
        self.settings = settings
        self.client = client
        prompts = files("ecus_api.ai").joinpath("prompts")
        self._extraction_prompt = prompts.joinpath(
            f"extract.{settings.ai_prompt_version}.txt"
        ).read_text(encoding="utf-8")
        self._hs_prompt = prompts.joinpath(f"hs.{settings.ai_prompt_version}.txt").read_text(
            encoding="utf-8"
        )

    async def extract_document(
        self, text: str, schema: type[T], *, images: tuple[ImageInput, ...] = ()
    ) -> AIResult[T]:
        return await self._complete(
            model=self.settings.ai_extraction_model,
            instructions=self._extraction_prompt,
            text=text,
            schema=schema,
            images=images,
        )

    async def suggest_hs(
        self, description: str, candidates: list[dict[str, str]], schema: type[T]
    ) -> AIResult[T]:
        return await self._complete(
            model=self.settings.ai_hs_model or self.settings.ai_extraction_model,
            instructions=self._hs_prompt,
            text=json.dumps(
                {"description": description, "candidates": candidates}, ensure_ascii=False
            ),
            schema=schema,
            images=(),
        )

    async def _complete(
        self,
        *,
        model: str,
        instructions: str,
        text: str,
        schema: type[T],
        images: tuple[ImageInput, ...],
    ) -> AIResult[T]:
        if not model:
            raise AppError("ai_not_configured", "No AI model is configured.", 503)
        key = self.settings.ai_api_key.get_secret_value()
        host = urlsplit(self.settings.ai_base_url).hostname or ""
        if (host == "openai.com" or host.endswith(".openai.com")) and not key:
            raise AppError("ai_not_configured", "No OpenAI API key is configured.", 503)
        if images and not self.settings.ai_supports_vision:
            raise AppError(
                "ai_vision_unsupported", "The configured model does not support images.", 422
            )
        if (
            len(text) > self.settings.ai_max_input_chars
            or len(images) > self.settings.ai_max_images
        ):
            raise AppError(
                "ai_input_too_large", "Document input exceeds the configured limit.", 422
            )
        if sum(len(image.data) for image in images) > self.settings.ai_max_image_bytes:
            raise AppError("ai_input_too_large", "Image input exceeds the configured limit.", 422)

        output_schema = strict_schema(schema.model_json_schema())
        content: list[dict[str, Any]] = [{"type": "text", "text": text}]
        for image in images:
            encoded = base64.b64encode(image.data).decode("ascii")
            content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{image.mime_type};base64,{encoded}"},
                }
            )
        response_format: dict[str, Any]
        if self.settings.ai_output_mode == "json_schema":
            response_format = {
                "type": "json_schema",
                "json_schema": {"name": "result", "strict": True, "schema": output_schema},
            }
        else:
            response_format = {"type": "json_object"}
            instructions += "\nRequired JSON schema: " + json.dumps(output_schema)
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": instructions},
                {"role": "user", "content": content},
            ],
            "response_format": response_format,
        }
        url = self.settings.ai_base_url + "/chat/completions"
        trace = await asyncio.to_thread(tracing.begin, self.settings, url, payload)
        response: httpx.Response | None = None
        raw: Any = None
        error_code: str | None = None
        try:
            try:
                response = await self.client.post(
                    url,
                    headers={"Authorization": f"Bearer {key}"} if key else {},
                    json=payload,
                    timeout=self.settings.ai_timeout_seconds,
                )
                try:
                    raw = response.json()
                except ValueError:
                    raw = response.text
                response.raise_for_status()
            except httpx.TimeoutException:
                raise AppError("ai_timeout", "The AI provider timed out.", 504) from None
            except httpx.HTTPError as error:
                provider_error = raw.get("error") if isinstance(raw, dict) else None
                if (
                    isinstance(error, httpx.HTTPStatusError)
                    and error.response.status_code in {403, 404}
                    and isinstance(provider_error, dict)
                    and provider_error.get("code") == "model_not_found"
                ):
                    raise AppError(
                        "ai_model_unavailable",
                        "The configured AI model is unavailable to this provider account.",
                        503,
                    ) from None
                raise AppError("ai_unavailable", "The AI provider is unavailable.", 502) from None
            try:
                completion = _Completion.model_validate(raw)
                if not completion.choices:
                    raise ValueError("missing choice")
                choice = completion.choices[0]
                if choice.message.refusal:
                    raise AppError("ai_refused", "The AI provider declined the request.", 422)
                if choice.finish_reason != "stop" or choice.message.content is None:
                    raise AppError(
                        "ai_incomplete", "The AI response is incomplete and requires review.", 502
                    )
                value = schema.model_validate_json(choice.message.content)
            except (ValidationError, ValueError, TypeError):
                raise AppError(
                    "ai_invalid_output", "The AI response does not match the required schema.", 502
                ) from None
            return AIResult(
                value=value,
                model=completion.model,
                usage=completion.usage or {},
                request_id=response.headers.get("x-request-id"),
                prompt_version=self.settings.ai_prompt_version,
                trace_id=trace["id"] if trace else None,
            )
        except AppError as error:
            error_code = error.code
            raise
        except BaseException:
            error_code = "ai_interrupted"
            raise
        finally:
            await asyncio.shield(
                asyncio.to_thread(
                    tracing.finish,
                    self.settings,
                    trace,
                    body=raw,
                    http_status=response.status_code if response is not None else None,
                    request_id=response.headers.get("x-request-id")
                    if response is not None
                    else None,
                    error_code=error_code,
                )
            )
