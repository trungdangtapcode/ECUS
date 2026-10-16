"""One cached AI request reviews every differing field without approving any values."""

import asyncio
import hashlib
import json
import re
from collections import Counter
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import Field
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from ecus_api.ai import tracing
from ecus_api.ai.contracts import StructuredAI
from ecus_api.core.config import Settings
from ecus_api.core.errors import AppError
from ecus_api.db.base import utcnow
from ecus_api.jobs.models import ProcessingJob
from ecus_api.jobs.runner import Handler
from ecus_api.modules.review import service
from ecus_api.modules.review.domain import comparison_value, effective_pages, normalize_field
from ecus_api.modules.review.schemas import (
    CanonicalInput,
    ConfirmFieldsInput,
    Observation,
    ReconciliationBatch,
    ReconciliationDecision,
    ReviewedReconciliationDecision,
    Revision,
    Workspace,
)
from ecus_api.modules.review.schemas_base import Contract
from ecus_api.modules.review.semantic import current_decision, equivalence_guard, field_fingerprint

JOB_KIND = "review.reconcile"


class ReconciliationInput(Revision):
    locale: Literal["en", "vi"] = "vi"


class ReconciliationOutput(Contract):
    decisions: list[ReconciliationDecision] = Field(max_length=2000)


class ReconciliationApply(ConfirmFieldsInput):
    reviewed: bool = False


class ReconciliationRun(Contract):
    id: UUID
    status: str
    error_code: str | None
    source_revision: int
    current: bool
    request_count: int
    batch: ReconciliationBatch | None = None


def candidates(state: Workspace) -> dict[str, list[Observation]]:
    documents = {item.id for item in state.documents if not item.withdrawn}
    mapped = {item.field for item in state.template.mappings} if state.template else set()
    result = {}
    for rule in state.policy.fields if state.policy else []:
        sources = [
            item
            for item in state.observations
            if item.field == rule.field and item.state == "active" and item.document_id in documents
        ]
        if rule.field in mapped and len({comparison_value(item, rule) for item in sources}) > 1:
            result[rule.field] = sources
    return result


def fingerprint(state: Workspace) -> str:
    return hashlib.sha256(
        json.dumps({field: field_fingerprint(state, field) for field in candidates(state)}).encode()
    ).hexdigest()


def prepare(state: Workspace, data: ReconciliationInput, settings: Settings) -> dict[str, Any]:
    fields = candidates(state)
    if not fields:
        raise AppError(
            "reconciliation_not_needed", "No differing mapped values require review.", 422
        )
    if len(fields) > settings.reconciliation_max_fields:
        raise AppError("ai_input_too_large", "The one-request field limit was exceeded.", 422)
    if not (settings.ai_reconciliation_model or settings.ai_extraction_model):
        raise AppError("ai_not_configured", "Configure a reconciliation model first.", 503)
    documents = {item.id: item for item in state.documents if not item.withdrawn}
    assert state.policy is not None
    definitions = {item.field: item for item in state.policy.fields}
    requested = []
    for field, sources in fields.items():
        evidence = []
        for source in sources:
            document = documents[source.document_id]
            page = effective_pages(document)[source.page - 1]
            margin = settings.reconciliation_context_chars
            evidence.append(
                {
                    "id": str(source.id),
                    "file": document.filename,
                    "document_type": source.document_type,
                    "page": source.page,
                    "quote": source.quote,
                    "value": source.normalized,
                    "unit": source.unit,
                    "context": page[
                        max(0, source.offset - margin) : source.offset + len(source.quote) + margin
                    ],
                }
            )
        requested.append({**definitions[field].model_dump(), "sources": evidence})
    text = json.dumps(
        {"task": "reconcile_source_values", "language": data.locale, "fields": requested},
        ensure_ascii=False,
    )
    if len(text) > settings.ai_max_input_chars:
        raise AppError("ai_input_too_large", "All differences must fit in one AI request.", 422)
    return {
        "revision": state.revision,
        "fingerprint": fingerprint(state),
        "locale": data.locale,
        "prompt_version": settings.reconciliation_prompt_version,
        "text": text,
    }


def validate_decision(
    state: Workspace,
    field: str,
    sources: list[Observation],
    proposal: ReconciliationDecision | None,
) -> ReviewedReconciliationDecision:
    ids = [item.id for item in sources]
    guard = None
    if proposal is None:
        guard = "model_omitted"
        proposal = ReconciliationDecision(
            field=field,
            classification="uncertain",
            source_ids=ids,
            reason="No unique supported model decision was returned.",
        )
    elif len(proposal.source_ids) != len(ids) or set(proposal.source_ids) != set(ids):
        guard = "source_coverage_invalid"
    source = next((item for item in sources if item.id == proposal.source_observation_id), None)
    if proposal.source_observation_id and source is None:
        guard = "source_coverage_invalid"
    rule = (
        next(item for item in state.policy.fields if item.field == field) if state.policy else None
    )
    assert rule is not None
    if proposal.proposed_value:
        try:
            value, _ = normalize_field(proposal.proposed_value, rule, rule.unit, "en")
            if source and value != source.normalized:
                guard = "proposed_value_unsupported"
            if source and rule.unit and source.unit != rule.unit:
                guard = "unit_difference"
            if rule.value_type == "decimal" and (
                not source or Decimal(value) != Decimal(source.normalized)
            ):
                guard = "proposed_value_unsupported"
            if rule.value_type == "text" and not source:
                digits = set(re.findall(r"\d+", value))
                available = {
                    number for item in sources for number in re.findall(r"\d+", item.quote)
                }
                if digits - available:
                    guard = "proposed_value_unsupported"
        except AppError:
            guard = "proposed_value_unsupported"
    elif source or proposal.classification == "equivalent":
        guard = "proposed_value_unsupported"
    if proposal.classification == "equivalent":
        guard = guard or equivalence_guard(field, sources)
    if guard:
        proposal = proposal.model_copy(
            update={
                "classification": "uncertain",
                "source_ids": ids,
                "source_observation_id": None,
                "proposed_value": None,
            }
        )
    return ReviewedReconciliationDecision(
        **proposal.model_dump(),
        source_fingerprint=field_fingerprint(state, field),
        guard_code=guard,
    )


def handler(
    sessions: async_sessionmaker[AsyncSession], ai: StructuredAI, settings: Settings
) -> Handler:
    async def reconcile(payload: dict[str, Any]) -> dict[str, Any]:
        case_id, job_id = UUID(payload["case_id"]), UUID(payload["_job_id"])
        async with sessions() as session:
            state = await service.load(session, case_id)
        if fingerprint(state) != payload["fingerprint"]:
            raise AppError("reconciliation_stale", "Evidence changed before the AI request.", 409)
        fields = candidates(state)
        async with sessions() as session:
            await session.execute(
                update(ProcessingJob)
                .where(ProcessingJob.id == job_id)
                .values(result={"request_count": 1})
            )
            await session.commit()
        with tracing.scope(
            case_id=case_id, job_id=job_id, phase="reconciliation", fields=list(fields)
        ):
            result = await ai.reconcile_values(payload["text"], ReconciliationOutput)
        counts = Counter(item.field for item in result.value.decisions)
        proposals = {item.field: item for item in result.value.decisions if counts[item.field] == 1}
        decisions = [
            validate_decision(state, key, sources, proposals.get(key))
            for key, sources in fields.items()
        ]
        batch = ReconciliationBatch(
            id=job_id,
            fingerprint=payload["fingerprint"],
            source_revision=payload["revision"],
            locale=payload["locale"],
            model=result.model,
            prompt_version=payload["prompt_version"],
            trace_id=result.trace_id,
            provider_request_id=result.request_id,
            at=utcnow(),
            decisions=decisions,
        )
        await asyncio.to_thread(
            tracing.annotate,
            settings,
            case_id,
            result.trace_id,
            [
                {
                    "field": item.field,
                    "status": "rejected" if item.guard_code else "accepted",
                    "error_code": item.guard_code,
                    "normalized": item.proposed_value,
                }
                for item in decisions
            ],
        )
        saved = {"batch": batch.model_dump(mode="json"), "request_count": 1}
        # Retain a completed provider response even if the evidence changed during the request.
        async with sessions() as session:
            await session.execute(
                update(ProcessingJob).where(ProcessingJob.id == job_id).values(result=saved)
            )
            await session.commit()
        async with sessions() as session:
            current = await service.load(session, case_id)
            if fingerprint(current) == payload["fingerprint"]:
                current.ai_reconciliation = batch
                service.audit(current, "ai_reconciliation_proposed", str(job_id))
                await service.save(
                    session,
                    case_id,
                    current,
                    current.revision,
                    preserve_approval=current.approved_revision == current.revision,
                )
        return saved

    return reconcile


def describe(job: ProcessingJob, state: Workspace) -> ReconciliationRun:
    raw = job.result or {}
    return ReconciliationRun(
        id=job.id,
        status=job.status,
        error_code=job.error_code,
        source_revision=job.payload["revision"],
        current=job.payload["fingerprint"] == fingerprint(state),
        request_count=raw.get("request_count", 0),
        batch=ReconciliationBatch.model_validate(raw["batch"]) if raw.get("batch") else None,
    )


def apply(state: Workspace, job_id: UUID, data: ReconciliationApply) -> None:
    if not data.reviewed:
        raise AppError("reconciliation_review_required", "Confirm the evidence review first.", 422)
    if not state.ai_reconciliation or state.ai_reconciliation.id != job_id:
        raise AppError("reconciliation_stale", "Choose the current AI review.", 409)
    selected = []
    for field in dict.fromkeys(data.fields):
        if field in state.canonical_values or field in state.selections:
            raise AppError(
                "reconciliation_value_already_reviewed",
                "Existing operator choices must be edited or withdrawn explicitly.",
                409,
            )
        decision = current_decision(state, field)
        if not decision or decision.guard_code or not decision.proposed_value:
            raise AppError(
                "reconciliation_stale", "The requested proposal is unavailable or stale.", 409
            )
        selected.append(decision)
    # Validate on a copy so a rejected batch cannot apply only its first fields.
    proposed = state.model_copy(deep=True)
    for decision in selected:
        service.edit_canonical(
            proposed,
            decision.field,
            CanonicalInput(
                revision=data.revision,
                reviewed=True,
                source_observation_id=decision.source_observation_id,
                value=decision.proposed_value or "",
                number_locale="en",
                reason=data.reason,
            ),
        )
        value = proposed.canonical_values[decision.field]
        value.source_ids = (
            [decision.source_observation_id]
            if decision.source_observation_id
            else list(decision.source_ids)
        )
        value.ai_reconciliation_id = job_id
    state.canonical_values = proposed.canonical_values
    state.canonical_history = proposed.canonical_history
    state.audit = proposed.audit
    service.audit(
        state, "ai_reconciliation_confirmed", f"{job_id}; {','.join(data.fields)}; {data.reason}"
    )
