"""AI proposals are isolated from reviewed data until an explicit, revision-checked import."""

import asyncio
import json
from importlib.resources import files
from typing import Any, Literal
from uuid import UUID

from pydantic import Field, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from ecus_api.ai import tracing
from ecus_api.ai.contracts import ImageInput, StructuredAI
from ecus_api.core.config import Settings
from ecus_api.core.errors import AppError
from ecus_api.jobs.models import ProcessingJob
from ecus_api.jobs.runner import Handler
from ecus_api.modules.review import prompt_fields, service
from ecus_api.modules.review.domain import effective_pages, normalize_field
from ecus_api.modules.review.policy import FieldRule
from ecus_api.modules.review.schemas import ObservationInput, Revision, Workspace
from ecus_api.modules.review.schemas_base import Contract
from ecus_api.modules.review.source_anchors import resolve_quote_offset
from ecus_api.storage import pdf_images
from ecus_api.storage.local import LocalBlobStore

JOB_KIND = "review.extract"


class ExtractionInput(Revision):
    document_id: UUID
    fields: list[FieldRule] = Field(min_length=1, max_length=50)


class ProposedField(Contract):
    source_context: str | None = Field(default=None, min_length=1, max_length=2000)
    line_identity_quote: str | None = Field(default=None, min_length=1, max_length=2000)
    source_offset: int | None = Field(default=None, ge=0)
    field: str = Field(min_length=1, max_length=64)
    document_type: str = Field(min_length=1, max_length=80)
    page: int = Field(ge=1)
    quote: str = Field(min_length=1, max_length=2000)
    unit: str = Field(max_length=20)
    number_locale: Literal["en", "vi"]
    confidence: float = Field(ge=0, le=1)


class ExtractionOutput(Contract):
    fields: list[ProposedField] = Field(max_length=200)


class ExtractionRun(Contract):
    id: UUID
    document_id: UUID
    source_revision: int
    status: str
    error_code: str | None
    model: str | None = None
    prompt_version: str | None = None
    accepted_count: int = 0
    rejected_count: int = 0
    applied: bool = False


def prepare(state: Workspace, data: ExtractionInput, settings: Settings) -> dict[str, Any]:
    document = next(
        (item for item in state.documents if item.id == data.document_id and not item.withdrawn),
        None,
    )
    if document is None:
        raise AppError("source_not_found", "Active document not found.", 404)
    if not settings.ai_extraction_model:
        raise AppError("ai_not_configured", "Configure an extraction model.", 503)
    if settings.extraction_use_page_images and (
        not settings.ai_supports_vision or settings.ai_max_images == 0
    ):
        raise AppError(
            "ai_vision_unsupported", "Enable a compatible image provider and budget.", 422
        )
    if not any(page.strip() for page in effective_pages(document)):
        raise AppError("ocr_required", "This source needs OCR before text extraction.", 422)
    if len({field.field for field in data.fields}) != len(data.fields):
        raise AppError("invalid_policy", "Requested field identifiers must be unique.", 422)
    if len(state.observations) >= settings.review_max_observations:
        raise AppError("workspace_limit", "The observation limit was reached.", 422)
    payload = data.model_dump(mode="json")
    payload["storage_key"] = document.storage_key
    return payload


def handler(
    sessions: async_sessionmaker[AsyncSession], ai: StructuredAI, settings: Settings
) -> Handler:
    async def extract(payload: dict[str, Any]) -> dict[str, Any]:
        case_id = UUID(payload["case_id"])
        request = ExtractionInput.model_validate(
            {key: payload[key] for key in ("revision", "document_id", "fields")}
        )
        async with sessions() as session:
            state = await service.load(session, case_id)
        prepare(state, request, settings)
        if state.revision != request.revision:
            raise AppError("revision_conflict", "Case changed before extraction started.", 409)
        document = next(item for item in state.documents if item.id == request.document_id)
        catalog = await asyncio.to_thread(
            prompt_fields.load_catalog, settings.extraction_field_catalog_path
        )
        prompt_name = f"review-source-proposals.{settings.review_source_prompt_version}"
        images: tuple[ImageInput, ...] = ()
        if settings.extraction_use_page_images:
            content = await asyncio.to_thread(
                LocalBlobStore(settings.storage_root).read, document.storage_key
            )
            images = await asyncio.to_thread(
                pdf_images.page_images,
                content,
                list(range(1, len(document.pages) + 1)),
                {page: result.rotation for page, result in document.ocr_pages.items()},
                settings,
            )
        text = json.dumps(
            {
                "task": files("ecus_api.ai")
                .joinpath(f"prompts/{prompt_name}.txt")
                .read_text(encoding="utf-8"),
                "requested_fields": prompt_fields.requested_fields(request.fields, catalog),
                "field_catalog_version": catalog.version,
                "image_page_numbers": list(range(1, len(document.pages) + 1)) if images else [],
                "pages": [
                    {"page": index + 1, "text": text}
                    for index, text in enumerate(effective_pages(document))
                ],
            },
            ensure_ascii=False,
        )
        if len(text) > settings.ai_max_input_chars:
            raise AppError("ai_input_too_large", "Split the request before extraction.", 422)
        with tracing.scope(
            case_id=case_id,
            job_id=payload.get("_job_id"),
            document_id=document.id,
            phase="extraction",
            fields=[field.field for field in request.fields],
            pages=list(range(1, len(document.pages) + 1)),
        ):
            result = await ai.extract_document(text, ExtractionOutput, images=images)
        validation: list[dict[str, Any]] = []
        definitions = {item.field: item for item in request.fields}
        accepted: list[dict[str, Any]] = []
        seen: set[tuple[str, int, str]] = set()
        confidences: list[float] = []
        rejected = 0
        for proposal in result.value.fields:
            rule = definitions.get(proposal.field)
            identity = (proposal.field, proposal.page, proposal.quote)
            if rule is None or proposal.page > len(document.pages) or identity in seen:
                rejected += 1
                validation.append(
                    {
                        "field": proposal.field,
                        "status": "rejected",
                        "error_code": "unrequested_or_duplicate_proposal",
                    }
                )
                continue
            page = effective_pages(document)[proposal.page - 1]
            try:
                offset = resolve_quote_offset(
                    page, proposal.quote, proposal.source_offset, proposal.source_context
                )
                normalize_field(proposal.quote, rule, proposal.unit, proposal.number_locale)
                item = ObservationInput(
                    revision=request.revision,
                    field=rule.field,
                    document_id=document.id,
                    document_type=proposal.document_type,
                    page=proposal.page,
                    source_offset=offset,
                    quote=proposal.quote,
                    value_type=rule.value_type,
                    unit=proposal.unit,
                    number_locale=proposal.number_locale,
                    verified=False,
                )
            except (AppError, ValidationError) as error:
                validation.append(
                    {
                        "field": proposal.field,
                        "status": "rejected",
                        "error_code": error.code
                        if isinstance(error, AppError)
                        else "invalid_proposal",
                    }
                )
                rejected += 1
                continue
            validation.append(
                {"field": proposal.field, "status": "accepted", "page": proposal.page}
            )
            accepted.append(item.model_dump(mode="json"))
            confidences.append(proposal.confidence)
            seen.add(identity)
        proposed = {proposal.field for proposal in result.value.fields}
        validation.extend(
            {"field": field.field, "status": "not_proposed"}
            for field in request.fields
            if field.field not in proposed
        )
        await asyncio.to_thread(tracing.annotate, settings, case_id, result.trace_id, validation)
        return {
            "trace_id": result.trace_id,
            "observations": accepted,
            "confidences": confidences,
            "rejected_count": rejected,
            "model": result.model,
            "prompt_version": f"{prompt_name}/{result.prompt_version}",
            "field_catalog_version": catalog.version,
            "image_page_numbers": list(range(1, len(document.pages) + 1)) if images else [],
            "usage": result.usage,
            "provider_request_id": result.request_id,
        }

    return extract


def describe(job: ProcessingJob, state: Workspace) -> ExtractionRun:
    result = job.result or {}
    return ExtractionRun(
        id=job.id,
        document_id=UUID(job.payload["document_id"]),
        source_revision=job.payload["revision"],
        status=job.status,
        error_code=job.error_code,
        model=result.get("model"),
        prompt_version=result.get("prompt_version"),
        accepted_count=len(result.get("observations", [])),
        rejected_count=result.get("rejected_count", 0),
        applied=job.id in state.applied_extractions,
    )


def apply(state: Workspace, job: ProcessingJob, maximum: int) -> None:
    if job.id in state.applied_extractions:
        raise AppError("extraction_already_applied", "This result has already been imported.", 409)
    if job.status != "succeeded" or not job.result:
        raise AppError("extraction_not_ready", "Extraction has not completed successfully.", 409)
    if job.payload["revision"] != state.revision:
        raise AppError(
            "revision_conflict",
            "Source revision changed. Review before requesting a new extraction.",
            409,
        )
    proposed = [ObservationInput.model_validate(item) for item in job.result["observations"]]
    if len(state.observations) + len(proposed) > maximum:
        raise AppError("workspace_limit", "The observation limit was reached.", 422)
    if not proposed:
        raise AppError("extraction_empty", "No supported source values were found.", 422)
    for index, proposal in enumerate(proposed):
        proposal.verified = False
        try:
            observation = service.add_observation(state, proposal)
        except AppError as exc:
            if exc.code == "duplicate_observation":
                continue
            raise
        observation.origin = "ai"
        observation.extraction_confidence = job.result["confidences"][index]
        observation.extraction_run_id = job.id
    state.applied_extractions.append(job.id)
    service.audit(
        state,
        "extraction_imported",
        f"{job.id}; model={job.result['model']}; "
        f"prompt={job.result['prompt_version']}; rejected={job.result['rejected_count']}",
    )
