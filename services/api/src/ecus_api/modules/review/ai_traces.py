"""Case-scoped access to private AI transport diagnostics."""

import asyncio
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field
from sqlalchemy.ext.asyncio import AsyncSession

from ecus_api.ai import tracing
from ecus_api.core.config import Settings
from ecus_api.modules.cases.service import get_case
from ecus_api.modules.review.schemas_base import Contract


class TraceValidation(Contract):
    field: str | None = None
    status: str
    error_code: str | None = None
    page: int | None = None
    normalized: str | None = None
    document_type: str | None = None
    page_from: int | None = None
    page_to: int | None = None


class TraceSummary(Contract):
    id: UUID
    at: datetime
    case_id: UUID
    job_id: UUID | None
    document_id: UUID | None
    phase: str
    fields: list[str]
    pages: list[int]
    model: str
    status: Literal["running", "succeeded", "failed"]
    http_status: int | None
    provider_request_id: str | None
    duration_ms: int
    error_code: str | None
    image_count: int
    validation: list[TraceValidation] = Field(default_factory=list)


class TracePage(Contract):
    enabled: bool
    items: list[TraceSummary]
    total: int
    limit: int
    offset: int


async def list_calls(
    session: AsyncSession, settings: Settings, case_id: UUID, limit: int, offset: int
) -> TracePage:
    await get_case(session, case_id)
    records = await asyncio.to_thread(tracing.summaries, settings, case_id)
    return TracePage(
        enabled=settings.ai_trace_enabled,
        items=[TraceSummary.model_validate(item) for item in records[offset : offset + limit]],
        total=len(records),
        limit=limit,
        offset=offset,
    )


async def call_content(
    session: AsyncSession, settings: Settings, case_id: UUID, trace_id: UUID
) -> bytes:
    await get_case(session, case_id)
    return await asyncio.to_thread(tracing.content, settings, case_id, trace_id)
