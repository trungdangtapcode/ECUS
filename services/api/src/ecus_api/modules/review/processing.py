"""Whole-set processing produces reviewable evidence in one atomic revision."""

import asyncio
import json
import re
import shutil
from collections import Counter
from importlib.resources import files
from typing import Any, Literal
from urllib.parse import urlsplit
from uuid import UUID, uuid4

from pydantic import Field, ValidationError
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from ecus_api.ai import tracing
from ecus_api.ai.contracts import ImageInput, StructuredAI
from ecus_api.core.config import Settings
from ecus_api.core.errors import AppError
from ecus_api.db.base import utcnow
from ecus_api.jobs.models import ProcessingJob
from ecus_api.jobs.runner import Handler
from ecus_api.modules.review import extraction, prompt_fields, service
from ecus_api.modules.review.domain import effective_pages
from ecus_api.modules.review.schemas import LogicalDocument, ObservationInput, Revision, Workspace
from ecus_api.modules.review.schemas_base import Contract
from ecus_api.modules.review.source_anchors import resolve_quote_offset
from ecus_api.storage import ocr, pdf_images
from ecus_api.storage.local import LocalBlobStore

JOB_KIND = "review.process"


class SectionProposal(Contract):
    document_type: str = Field(min_length=1, max_length=80)
    page_from: int = Field(ge=1)
    page_to: int = Field(ge=1)
    heading_quote: str = Field(min_length=1, max_length=500)
    confidence: float = Field(ge=0, le=1)


class SetOutput(Contract):
    sections: list[SectionProposal] = Field(max_length=60)
    fields: list[extraction.ProposedField] = Field(max_length=200)


class ProcessingInput(Revision):
    primary_invoice_id: UUID | None = None


class Capabilities(Contract):
    ai_configured: bool
    ocr_available: bool
    test_environment: bool
    mock_ai_transport: bool


def capabilities(settings: Settings) -> Capabilities:
    host = urlsplit(settings.ai_base_url).hostname or ""
    is_openai = host == "openai.com" or host.endswith(".openai.com")
    return Capabilities(
        ai_configured=bool(
            settings.ai_extraction_model
            and (not is_openai or settings.ai_api_key.get_secret_value())
        ),
        ocr_available=settings.ocr_enabled and shutil.which(settings.ocr_command) is not None,
        test_environment=settings.app_env == "test",
        mock_ai_transport=settings.app_env == "test"
        and settings.ai_test_transport
        and not is_openai,
    )


class Progress(Contract):
    phase: Literal["queued", "ocr", "classification", "extraction", "saving", "completed"] = (
        "queued"
    )
    completed: int = 0
    total: int = 0
    document_id: UUID | None = None


class ProcessingRun(Contract):
    rejection_reasons: dict[str, int] = Field(default_factory=dict)
    id: UUID
    source_revision: int
    status: str
    error_code: str | None
    progress: Progress = Field(default_factory=Progress)
    accepted_count: int = 0
    rejected_count: int = 0
    ocr_count: int = 0
    applied: bool = False


def prepare(
    state: Workspace, settings: Settings, primary_invoice_id: UUID | None = None
) -> dict[str, Any]:
    if not any(not document.withdrawn for document in state.documents):
        raise AppError("documents_missing", "Upload active documents before processing.", 422)
    if not state.template or not state.policy or not state.policy.fields:
        raise AppError("template_missing", "Choose a configured workbook layout first.", 422)
    if not capabilities(settings).ai_configured:
        raise AppError("ai_not_configured", "Configure the extraction provider first.", 503)
    if settings.extraction_use_page_images and (
        not settings.ai_supports_vision or settings.ai_max_images == 0
    ):
        raise AppError(
            "ai_vision_unsupported", "Enable a compatible image provider and budget.", 422
        )
    if primary_invoice_id and not any(
        document.id == primary_invoice_id and not document.withdrawn for document in state.documents
    ):
        raise AppError("source_not_found", "Choose an active invoice document.", 422)
    return {
        "revision": state.revision,
        "primary_invoice_id": str(primary_invoice_id) if primary_invoice_id else None,
    }


def describe(job: ProcessingJob, state: Workspace) -> ProcessingRun:
    result = job.result or {}
    return ProcessingRun(
        id=job.id,
        source_revision=job.payload["revision"],
        status=job.status,
        error_code=job.error_code,
        progress=Progress.model_validate(result.get("progress", {})),
        accepted_count=result.get("accepted_count", 0),
        rejected_count=result.get("rejected_count", 0),
        rejection_reasons=result.get("rejection_reasons", {}),
        ocr_count=result.get("ocr_count", 0),
        applied=job.id in state.applied_extractions,
    )


def page_batches(pages: list[str], settings: Settings) -> list[list[dict[str, Any]]]:
    # Keep source page numbers and quotes intact. Never truncate a long page silently.
    batches: list[list[dict[str, Any]]] = []
    batch: list[dict[str, Any]] = []
    maximum_pages = settings.extraction_page_batch_size
    if settings.extraction_use_page_images:
        maximum_pages = min(maximum_pages, settings.ai_max_images)
    for number, text in enumerate(pages, 1):
        if not text.strip():
            continue
        page = {"page": number, "text": text}
        if len(json.dumps(page, ensure_ascii=False)) > settings.ai_max_input_chars // 2:
            raise AppError(
                "ai_input_too_large", "A source page exceeds the extraction budget.", 422
            )
        if batch and (
            len(batch) >= maximum_pages
            or len(json.dumps([*batch, page], ensure_ascii=False))
            > settings.ai_max_input_chars // 2
        ):
            batches.append(batch)
            batch = []
        batch.append(page)
    if batch:
        batches.append(batch)
    return batches


def handler(
    sessions: async_sessionmaker[AsyncSession], ai: StructuredAI, settings: Settings
) -> Handler:
    async def process(payload: dict[str, Any]) -> dict[str, Any]:
        case_id, job_id = UUID(payload["case_id"]), UUID(payload["_job_id"])
        revision = payload["revision"]
        async with sessions() as session:
            state = await service.load(session, case_id)
        if state.revision != revision:
            raise AppError("revision_conflict", "The source set changed before processing.", 409)
        prepare(state, settings)
        assert state.policy is not None
        store = LocalBlobStore(settings.storage_root)
        documents = [item for item in state.documents if not item.withdrawn]
        recognized = 0
        accepted, rejected = 0, 0
        rejection_reasons: Counter[str] = Counter()
        responses: list[dict[str, Any]] = []
        field_outcomes: dict[str, dict[str, Any]] = {
            rule.field: {"requested": 0, "proposed": 0, "accepted": 0, "rejections": {}}
            for rule in state.policy.fields
        }

        call_validation: list[dict[str, Any]] = []

        def reject(code: str, field: str | None = None) -> None:
            nonlocal rejected
            rejected += 1
            rejection_reasons[code] += 1
            call_validation.append({"field": field, "status": "rejected", "error_code": code})
            if field is not None and field in field_outcomes:
                reasons = field_outcomes[field]["rejections"]
                reasons[code] = reasons.get(code, 0) + 1

        async def progress(
            phase: str, completed: int, total: int, document_id: UUID | None = None
        ) -> None:
            async with sessions() as session:
                await session.execute(
                    update(ProcessingJob)
                    .where(ProcessingJob.id == job_id)
                    .values(
                        result={
                            "progress": {
                                "phase": phase,
                                "completed": completed,
                                "total": total,
                                "document_id": str(document_id) if document_id else None,
                            },
                            "accepted_count": accepted,
                            "rejected_count": rejected,
                            "rejection_reasons": dict(rejection_reasons),
                            "ocr_count": recognized,
                            "responses": list(responses),
                            "field_outcomes": field_outcomes,
                        },
                        updated_at=utcnow(),
                    )
                )
                await session.commit()

        unreadable = [
            (doc, index + 1)
            for doc in documents
            for index, text in enumerate(effective_pages(doc))
            if not text.strip()
        ]
        for index, (document, page) in enumerate(unreadable):
            await progress("ocr", index, len(unreadable), document.id)
            content = await asyncio.to_thread(store.read, document.storage_key)
            ocr_result = await ocr.recognize(content, page, settings)
            if not ocr_result.text.strip() and not ocr_result.is_blank:
                raise AppError(
                    "ocr_empty", "A scanned page could not be read. Review it manually.", 422
                )
            document.ocr_pages[page] = ocr_result
            recognized += int(not ocr_result.is_blank)

        if any(not any(text.strip() for text in effective_pages(doc)) for doc in documents):
            raise AppError(
                "ocr_empty", "A document has no readable content. Review it manually.", 422
            )

        prompt_name = f"review-set-proposals.{settings.review_set_prompt_version}"
        prompt = files("ecus_api.ai").joinpath(f"prompts/{prompt_name}.txt").read_text()
        catalog = await asyncio.to_thread(
            prompt_fields.load_catalog, settings.extraction_field_catalog_path
        )
        document_types = sorted(
            set(state.policy.required_documents)
            | {
                kind
                for requirement in state.policy.document_requirements
                for kind in requirement.any_of
            }
            | {kind for rule in state.policy.fields for kind in rule.preferred_sources}
        )
        classification_tasks = [
            (doc, pages)
            for doc in documents
            for pages in page_batches(effective_pages(doc), settings)
        ]
        for index, (document, pages) in enumerate(classification_tasks):
            await progress("classification", index, len(classification_tasks), document.id)
            call_validation = []
            with tracing.scope(
                case_id=case_id,
                job_id=job_id,
                document_id=document.id,
                phase="classification",
                pages=[page["page"] for page in pages],
            ):
                result = await ai.extract_document(
                    json.dumps(
                        {
                            "task": prompt
                            + "\nClassify only. Return no field proposals in this request.",
                            "requested_fields": [],
                            "pages": pages,
                            "configured_document_types": document_types,
                        },
                        ensure_ascii=False,
                    ),
                    SetOutput,
                )
            responses.append(
                {
                    "trace_id": result.trace_id,
                    "model": result.model,
                    "prompt_version": f"{prompt_name}/{result.prompt_version}",
                    "field_catalog_version": catalog.version,
                    "usage": result.usage,
                    "provider_request_id": result.request_id,
                }
            )
            page_numbers = {page["page"] for page in pages}
            for section in result.value.sections:
                if (
                    section.page_from not in page_numbers
                    or section.page_to not in page_numbers
                    or section.page_from > section.page_to
                    or section.heading_quote not in effective_pages(document)[section.page_from - 1]
                ):
                    reject("invalid_section_evidence")
                    continue
                call_validation.append(
                    {
                        "document_type": section.document_type,
                        "status": "accepted",
                        "page_from": section.page_from,
                        "page_to": section.page_to,
                    }
                )
                if not any(
                    not item.withdrawn
                    and item.document_id == document.id
                    and item.document_type == section.document_type
                    and item.page_from == section.page_from
                    and item.page_to == section.page_to
                    for item in state.logical_documents
                ):
                    state.logical_documents.append(
                        LogicalDocument(
                            id=uuid4(),
                            document_id=document.id,
                            document_type=section.document_type,
                            page_from=section.page_from,
                            page_to=section.page_to,
                            reason="AI classification proposal; source heading validated.",
                            origin="ai",
                            verified=False,
                            confidence=section.confidence,
                        )
                    )
            await asyncio.to_thread(
                tracing.annotate, settings, case_id, result.trace_id, call_validation
            )
        await progress("classification", len(classification_tasks), len(classification_tasks))
        primary_id = (
            UUID(payload["primary_invoice_id"]) if payload.get("primary_invoice_id") else None
        )
        invoices = {
            item.document_id
            for item in state.logical_documents
            if not item.withdrawn and item.document_type == "INVOICE"
        }
        if primary_id is None and len(invoices) == 1:
            primary_id = next(iter(invoices))
        if (
            primary_id is None
            and len(invoices) > 1
            and any(re.match(r"^goods_\d{3}_", rule.field) for rule in state.policy.fields)
        ):
            raise AppError(
                "primary_invoice_required",
                "Choose the primary invoice before extracting repeated goods fields.",
                422,
            )
        if primary_id and primary_id not in invoices:
            raise AppError(
                "invalid_primary_invoice",
                "The chosen source was not classified as an invoice.",
                422,
            )
        documents.sort(key=lambda item: item.id != primary_id)
        groups = [
            state.policy.fields[index : index + settings.extraction_field_batch_size]
            for index in range(0, len(state.policy.fields), settings.extraction_field_batch_size)
        ]
        tasks = [
            (doc, pages, fields)
            for doc in documents
            for pages in page_batches(effective_pages(doc), settings)
            for fields in groups
        ]
        image_key: tuple[UUID, tuple[int, ...]] | None = None
        images: tuple[ImageInput, ...] = ()
        for index, (document, pages, fields) in enumerate(tasks):
            await progress("extraction", index, len(tasks), document.id)
            primary_lines: dict[str, dict[str, str]] = {}
            for source in state.observations:
                line = re.match(r"^(goods_\d{3})_(description|management_code)$", source.field)
                if line and source.document_id == primary_id and source.state == "active":
                    primary_lines.setdefault(line[1], {})[line[2]] = source.quote
            # Secondary documents need an evidenced line identity; never join by row position.
            fields = [
                field
                for field in fields
                if not (line := re.match(r"^(goods_\d{3})_", field.field))
                or document.id == primary_id
                or line[1] in primary_lines
            ]
            if not fields:
                continue
            if settings.extraction_use_page_images:
                key = (document.id, tuple(page["page"] for page in pages))
                if image_key != key:
                    content = await asyncio.to_thread(store.read, document.storage_key)
                    images = await asyncio.to_thread(
                        pdf_images.page_images,
                        content,
                        list(key[1]),
                        {page: result.rotation for page, result in document.ocr_pages.items()},
                        settings,
                    )
                    image_key = key
            text = json.dumps(
                {
                    "task": prompt,
                    "requested_fields": prompt_fields.requested_fields(fields, catalog),
                    "field_catalog_version": catalog.version,
                    "pages": pages,
                    "primary_invoice_lines": primary_lines,
                    "is_primary_invoice": document.id == primary_id,
                    "configured_document_types": document_types,
                    "image_page_numbers": [page["page"] for page in pages] if images else [],
                },
                ensure_ascii=False,
            )
            if len(text) > settings.ai_max_input_chars:
                raise AppError(
                    "ai_input_too_large", "Reduce the configured extraction batch size.", 422
                )
            for field in fields:
                field_outcomes[field.field]["requested"] += 1
            call_validation = []
            with tracing.scope(
                case_id=case_id,
                job_id=job_id,
                document_id=document.id,
                phase="extraction",
                fields=[field.field for field in fields],
                pages=[page["page"] for page in pages],
            ):
                result = await ai.extract_document(text, SetOutput, images=images)
            responses.append(
                {
                    "trace_id": result.trace_id,
                    "model": result.model,
                    "prompt_version": f"{prompt_name}/{result.prompt_version}",
                    "field_catalog_version": catalog.version,
                    "image_page_numbers": [page["page"] for page in pages] if images else [],
                    "usage": result.usage,
                    "provider_request_id": result.request_id,
                }
            )
            page_numbers = {page["page"] for page in pages}
            definitions = {field.field: field for field in fields}
            for proposal in result.value.fields:
                rule = definitions.get(proposal.field)
                if rule is not None:
                    field_outcomes[proposal.field]["proposed"] += 1
                if rule is None or proposal.page not in page_numbers:
                    reject("unrequested_field_or_page", proposal.field if rule else None)
                    continue
                line = re.match(r"^(goods_\d{3})_", proposal.field)
                if line and document.id != primary_id:
                    identity = " ".join((proposal.line_identity_quote or "").casefold().split())
                    matching_lines = {
                        key
                        for key, values in primary_lines.items()
                        if identity
                        and identity
                        in {" ".join(value.casefold().split()) for value in values.values()}
                    }
                    if (
                        matching_lines != {line[1]}
                        or not proposal.line_identity_quote
                        or effective_pages(document)[proposal.page - 1].count(
                            proposal.line_identity_quote
                        )
                        != 1
                    ):
                        reject("line_identity_unproven", proposal.field)
                        continue
                try:
                    offset = resolve_quote_offset(
                        effective_pages(document)[proposal.page - 1],
                        proposal.quote,
                        proposal.source_offset,
                        proposal.source_context,
                    )
                    observation = service.add_observation(
                        state,
                        ObservationInput(
                            revision=revision,
                            field=proposal.field,
                            document_id=document.id,
                            document_type=proposal.document_type,
                            page=proposal.page,
                            source_offset=offset,
                            quote=proposal.quote,
                            value_type=rule.value_type,
                            unit=proposal.unit,
                            number_locale=proposal.number_locale,
                            verified=False,
                        ),
                    )
                except AppError as exc:
                    if exc.code != "duplicate_observation":
                        reject(exc.code, proposal.field)
                    else:
                        call_validation.append(
                            {"field": proposal.field, "status": "duplicate", "error_code": exc.code}
                        )
                    continue
                except ValidationError:
                    reject("invalid_proposal", proposal.field)
                    continue
                observation.origin = "ai"
                if line and document.id != primary_id:
                    observation.line_identity_quote = proposal.line_identity_quote
                    observation.primary_line_source_ids = [
                        source.id
                        for source in state.observations
                        if source.document_id == primary_id
                        and source.state == "active"
                        and source.field in {f"{line[1]}_description", f"{line[1]}_management_code"}
                        and " ".join(source.quote.casefold().split())
                        == " ".join((proposal.line_identity_quote or "").casefold().split())
                    ]
                observation.extraction_confidence = proposal.confidence
                observation.extraction_run_id = job_id
                call_validation.append(
                    {
                        "field": proposal.field,
                        "status": "accepted",
                        "page": proposal.page,
                        "normalized": observation.normalized,
                    }
                )
                accepted += 1
                field_outcomes[proposal.field]["accepted"] += 1
                if len(state.observations) > settings.review_max_observations:
                    raise AppError("workspace_limit", "The observation limit was reached.", 422)
            proposed = {proposal.field for proposal in result.value.fields}
            call_validation.extend(
                {"field": field.field, "status": "not_proposed"}
                for field in fields
                if field.field not in proposed
            )
            await asyncio.to_thread(
                tracing.annotate, settings, case_id, result.trace_id, call_validation
            )
            await progress("extraction", index + 1, len(tasks), document.id)
        if not any(source.state == "active" for source in state.observations):
            raise AppError("extraction_empty", "No supported source values were found.", 422)
        await progress("saving", len(tasks), len(tasks))
        state.applied_extractions.append(job_id)
        service.audit(
            state,
            "document_set_processed",
            f"{job_id}; sources={len(documents)}; accepted={accepted}; "
            f"rejected={rejected}; ocr={recognized}",
        )
        async with sessions() as session:
            # Optimistic, atomic save: never overwrite concurrent manual edits.
            await service.save(session, case_id, state, revision)
        return {
            "accepted_count": accepted,
            "rejected_count": rejected,
            "rejection_reasons": dict(rejection_reasons),
            "ocr_count": recognized,
            "responses": responses,
            "field_outcomes": field_outcomes,
            "progress": {"phase": "completed", "completed": len(tasks), "total": len(tasks)},
        }

    return process
