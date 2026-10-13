"""Private provider request/response artifacts, separate from ordinary application logs."""

import json
import os
import time
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import UTC, datetime
from functools import wraps
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from ecus_api.core.config import Settings
from ecus_api.core.errors import AppError

_context: ContextVar[dict[str, Any] | None] = ContextVar("ai_trace_context", default=None)


def _storage_operation[**P, R](function: Callable[P, R]) -> Callable[P, R]:
    @wraps(function)
    def guarded(*args: P.args, **kwargs: P.kwargs) -> R:
        try:
            return function(*args, **kwargs)
        except (OSError, json.JSONDecodeError):
            raise AppError(
                "ai_trace_unavailable", "Private AI trace storage is unavailable.", 503
            ) from None

    return guarded


@contextmanager
def scope(**context: Any) -> Iterator[None]:
    token = _context.set(
        {key: str(value) if isinstance(value, UUID) else value for key, value in context.items()}
    )
    try:
        yield
    finally:
        _context.reset(token)


def directory(settings: Settings, case_id: str | UUID | None) -> Path:
    root = settings.ai_trace_root or settings.storage_root.parent / "ai-traces"
    return root / (str(UUID(str(case_id))) if case_id else "unscoped")


def _write(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temporary = path.with_suffix(path.suffix + f".{uuid4().hex}.tmp")
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def _safe(value: Any, key: str) -> Any:
    if isinstance(value, dict):
        return {
            name: "[REDACTED]"
            if name.casefold() in {"authorization", "api_key", "x-api-key", "access_token"}
            else _safe(item, key)
            for name, item in value.items()
        }
    if isinstance(value, list):
        return [_safe(item, key) for item in value]
    if isinstance(value, str) and key:
        return value.replace(key, "[REDACTED]")
    return value


@_storage_operation
def begin(settings: Settings, url: str, body: dict[str, Any]) -> dict[str, Any] | None:
    if not settings.ai_trace_enabled:
        return None
    context = _context.get() or {}
    identifier = str(uuid4())
    folder = directory(settings, context.get("case_id"))
    summary = {
        "id": identifier,
        "at": datetime.now(UTC).isoformat(),
        "case_id": context.get("case_id"),
        "job_id": context.get("job_id"),
        "document_id": context.get("document_id"),
        "phase": context.get("phase", "direct"),
        "fields": context.get("fields", []),
        "pages": context.get("pages", []),
        "model": body["model"],
        "status": "running",
        "http_status": None,
        "provider_request_id": None,
        "duration_ms": 0,
        "error_code": None,
        "image_count": sum(
            item.get("type") == "image_url"
            for message in body["messages"]
            for item in message.get("content", [])
            if isinstance(item, dict)
        ),
        "validation": [],
    }
    record = {
        "summary": summary,
        "request": {
            "method": "POST",
            "url": url,
            "body": _safe(body, settings.ai_api_key.get_secret_value()),
        },
        "response": None,
    }
    try:
        _write(folder / f"{identifier}.json", record)
        _write(folder / f"{identifier}.summary.json", summary)
    except OSError:
        raise AppError(
            "ai_trace_unavailable", "Private AI trace storage is unavailable.", 503
        ) from None
    return {"id": identifier, "folder": folder, "started": time.monotonic()}


@_storage_operation
def finish(
    settings: Settings,
    trace: dict[str, Any] | None,
    *,
    body: Any = None,
    http_status: int | None = None,
    request_id: str | None = None,
    error_code: str | None = None,
) -> None:
    if trace is None:
        return
    path = trace["folder"] / f"{trace['id']}.json"
    record = json.loads(path.read_text(encoding="utf-8"))
    summary = record["summary"]
    summary.update(
        status="failed" if error_code or (http_status and http_status >= 400) else "succeeded",
        duration_ms=round((time.monotonic() - trace["started"]) * 1000),
        error_code=error_code,
    )
    if body is not None:
        record["response"] = _safe(body, settings.ai_api_key.get_secret_value())
    summary.update(http_status=http_status, provider_request_id=request_id)
    _write(path, record)
    _write(trace["folder"] / f"{trace['id']}.summary.json", summary)


@_storage_operation
def annotate(
    settings: Settings, case_id: UUID, trace_id: str | None, validation: list[dict[str, Any]]
) -> None:
    if not settings.ai_trace_enabled or trace_id is None:
        return
    folder = directory(settings, case_id)
    path = folder / f"{UUID(trace_id)}.summary.json"
    summary = json.loads(path.read_text(encoding="utf-8"))
    summary["validation"] = validation
    _write(path, summary)


@_storage_operation
def summaries(settings: Settings, case_id: UUID) -> list[dict[str, Any]]:
    folder = directory(settings, case_id)
    return sorted(
        (json.loads(path.read_text(encoding="utf-8")) for path in folder.glob("*.summary.json")),
        key=lambda item: item["at"],
        reverse=True,
    )


@_storage_operation
def content(settings: Settings, case_id: UUID, trace_id: UUID) -> bytes:
    folder = directory(settings, case_id)
    try:
        record = json.loads((folder / f"{trace_id}.json").read_text(encoding="utf-8"))
        summary = json.loads((folder / f"{trace_id}.summary.json").read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise AppError("ai_trace_not_found", "The AI call trace was not found.", 404) from None
    record["summary"] = summary
    return json.dumps(record, ensure_ascii=False, indent=2).encode()
