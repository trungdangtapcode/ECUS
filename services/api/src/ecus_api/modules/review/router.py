import asyncio
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ecus_api.core.config import Settings
from ecus_api.core.errors import AppError
from ecus_api.db.session import get_session
from ecus_api.jobs.models import ProcessingJob
from ecus_api.modules.cases.service import get_case
from ecus_api.modules.review import (
    ai_traces,
    extraction,
    processing,
    reconciliation,
    revisions,
    service,
    template_library,
)
from ecus_api.modules.review.domain import evaluate
from ecus_api.modules.review.schemas import (
    Applicability,
    ApplicabilityInput,
    CanonicalInput,
    ConfirmFieldsInput,
    CorrectionInput,
    DraftExportInput,
    LogicalDocumentInput,
    ObservationInput,
    PolicyInput,
    ReplacementInput,
    Revision,
    SelectionInput,
    StageInput,
    TemplateInput,
    TranscriptInput,
    Upload,
    VerifyInput,
    Workspace,
    WorkspaceRead,
)
from ecus_api.storage.local import LocalBlobStore

router = APIRouter(prefix="/cases/{case_id}/review", tags=["document-review"])
Session = Annotated[AsyncSession, Depends(get_session)]


@router.get(
    "/reconciliations",
    response_model=list[reconciliation.ReconciliationRun],
    operation_id="listAIReconciliations",
)
async def list_reconciliations(
    case_id: UUID, session: Session, request: Request
) -> list[reconciliation.ReconciliationRun]:
    state = await service.load(session, case_id)
    jobs = await session.scalars(
        select(ProcessingJob)
        .where(
            ProcessingJob.kind == reconciliation.JOB_KIND,
            ProcessingJob.payload["case_id"].as_string() == str(case_id),
        )
        .order_by(ProcessingJob.created_at.desc())
        .limit(20)
    )
    return [reconciliation.describe(job, state, settings_for(request)) for job in jobs]


@router.post(
    "/reconciliations",
    response_model=reconciliation.ReconciliationRun,
    status_code=202,
    operation_id="startAIReconciliation",
)
async def start_reconciliation(
    case_id: UUID, data: reconciliation.ReconciliationInput, session: Session, request: Request
) -> reconciliation.ReconciliationRun:
    state = await current(session, case_id, data.revision)
    payload = reconciliation.prepare(state, data, settings_for(request))
    payload["case_id"] = str(case_id)
    job_id = await request.app.state.jobs.submit(
        reconciliation.JOB_KIND,
        payload,
        deduplicate_by=("case_id", "fingerprint", "context_digest"),
        reuse_finished=True,
    )
    job = await session.get(ProcessingJob, job_id)
    assert job is not None
    return reconciliation.describe(job, state, settings_for(request))


@router.post(
    "/reconciliations/{job_id}/apply",
    response_model=WorkspaceRead,
    operation_id="confirmAIReconciliation",
)
async def confirm_reconciliation(
    case_id: UUID,
    job_id: UUID,
    data: reconciliation.ReconciliationApply,
    session: Session,
    request: Request,
) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    job = await session.get(ProcessingJob, job_id)
    if (
        job is None
        or job.kind != reconciliation.JOB_KIND
        or job.payload.get("case_id") != str(case_id)
        or not reconciliation.describe(job, state, settings_for(request)).current
    ):
        raise AppError("reconciliation_stale", "Choose the current AI review.", 409)
    reconciliation.apply(state, job_id, data)
    await service.save(session, case_id, state, data.revision)
    return output(state)


@router.get("/ai-traces", response_model=ai_traces.TracePage, operation_id="listReviewAICalls")
async def ai_calls(
    case_id: UUID,
    session: Session,
    request: Request,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ai_traces.TracePage:
    return await ai_traces.list_calls(session, settings_for(request), case_id, limit, offset)


@router.get("/ai-traces/{trace_id}/content", operation_id="downloadReviewAICall")
async def ai_call_content(
    case_id: UUID, trace_id: UUID, session: Session, request: Request
) -> Response:
    content = await ai_traces.call_content(session, settings_for(request), case_id, trace_id)
    return Response(
        content,
        media_type="application/json",
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": f'attachment; filename="ai-call-{trace_id}.json"',
        },
    )


@router.get(
    "/processing-capabilities",
    response_model=processing.Capabilities,
    operation_id="getReviewProcessingCapabilities",
)
async def processing_capabilities(
    case_id: UUID, session: Session, request: Request
) -> processing.Capabilities:
    await get_case(session, case_id)
    return processing.capabilities(settings_for(request))


@router.get(
    "/processing",
    response_model=list[processing.ProcessingRun],
    operation_id="listDocumentSetProcessing",
)
async def list_processing(case_id: UUID, session: Session) -> list[processing.ProcessingRun]:
    jobs = await session.scalars(
        select(ProcessingJob)
        .where(
            ProcessingJob.kind == processing.JOB_KIND,
            ProcessingJob.payload["case_id"].as_string() == str(case_id),
        )
        .order_by(ProcessingJob.created_at.desc())
        .limit(20)
    )
    state = await service.load(session, case_id)
    return [processing.describe(job, state) for job in jobs]


@router.post(
    "/processing",
    response_model=processing.ProcessingRun,
    status_code=202,
    operation_id="processDocumentSet",
)
async def process_documents(
    case_id: UUID, data: processing.ProcessingInput, session: Session, request: Request
) -> processing.ProcessingRun:
    state = await current(session, case_id, data.revision, allow_processing=True)
    active = await session.scalar(
        select(ProcessingJob).where(
            ProcessingJob.kind == processing.JOB_KIND,
            ProcessingJob.payload["case_id"].as_string() == str(case_id),
            ProcessingJob.status.in_(["pending", "running"]),
        )
    )
    if active:
        return processing.describe(active, state)
    if await session.scalar(
        select(ProcessingJob.id).where(
            ProcessingJob.kind == reconciliation.JOB_KIND,
            ProcessingJob.payload["case_id"].as_string() == str(case_id),
            ProcessingJob.status.in_(["pending", "running"]),
        )
    ):
        raise AppError("review_processing_active", "Wait for the current AI review first.", 409)
    payload = processing.prepare(state, settings_for(request), data.primary_invoice_id)
    payload["case_id"] = str(case_id)
    job_id = await request.app.state.jobs.submit(
        processing.JOB_KIND, payload, deduplicate_by=("case_id",)
    )
    job = await session.get(ProcessingJob, job_id)
    assert job is not None
    return processing.describe(job, state)


@router.post(
    "/confirm-fields", response_model=WorkspaceRead, operation_id="confirmConsistentFields"
)
async def confirm_fields(
    case_id: UUID, data: ConfirmFieldsInput, session: Session
) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    service.confirm_consistent_fields(state, data.fields, data.reason)
    await service.save(session, case_id, state, data.revision)
    return output(state)


@router.post(
    "/logical-documents/{logical_id}/verify",
    response_model=WorkspaceRead,
    operation_id="verifyLogicalDocument",
)
async def verify_logical(
    case_id: UUID, logical_id: UUID, data: VerifyInput, session: Session
) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    item = next(
        (item for item in state.logical_documents if item.id == logical_id and not item.withdrawn),
        None,
    )
    if item is None:
        raise AppError("source_not_found", "Active logical document not found.", 404)
    item.verified = True
    service.audit(state, "logical_document_verified", f"{logical_id}; {data.reason}")
    await service.save(session, case_id, state, data.revision)
    return output(state)


def settings_for(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    return settings


def storage(request: Request) -> LocalBlobStore:
    return LocalBlobStore(settings_for(request).storage_root)


def output(state: Workspace) -> WorkspaceRead:
    return WorkspaceRead(workspace=state, readiness=evaluate(state))


async def current(
    session: AsyncSession, case_id: UUID, revision: int, *, allow_processing: bool = False
) -> Workspace:
    state = await service.load(session, case_id)
    if state.revision != revision:
        raise AppError(
            "revision_conflict", "Reload the current case revision before retrying.", 409
        )
    if not allow_processing and await session.scalar(
        select(ProcessingJob.id).where(
            ProcessingJob.kind == processing.JOB_KIND,
            ProcessingJob.payload["case_id"].as_string() == str(case_id),
            ProcessingJob.status.in_(["pending", "running"]),
        )
    ):
        raise AppError(
            "review_processing_active", "Wait for document processing before editing.", 409
        )
    return state


@router.get("", response_model=WorkspaceRead, operation_id="getReviewWorkspace")
async def get_workspace(case_id: UUID, session: Session) -> WorkspaceRead:
    return output(await service.load(session, case_id))


@router.post("/documents", response_model=WorkspaceRead, operation_id="uploadReviewDocument")
async def upload_document(
    case_id: UUID, data: Upload, session: Session, request: Request
) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    settings = settings_for(request)
    if len(state.documents) >= settings.review_max_documents:
        raise AppError("workspace_limit", "The configured document limit was reached.", 422)
    await service.add_document(
        state, data, storage(request), settings.review_max_file_bytes, settings.review_max_pdf_pages
    )
    await service.save(session, case_id, state, data.revision)
    return output(state)


@router.get("/documents/{document_id}/content", operation_id="getReviewDocumentContent")
async def document_content(
    case_id: UUID, document_id: UUID, session: Session, request: Request
) -> Response:
    state = await service.load(session, case_id)
    document = next((item for item in state.documents if item.id == document_id), None)
    if document is None:
        raise AppError("source_not_found", "Document not found in this case.", 404)
    content = await asyncio.to_thread(storage(request).read, document.storage_key)
    return Response(
        content,
        media_type="application/pdf",
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": 'inline; filename="source.pdf"',
        },
    )


@router.post("/observations", response_model=WorkspaceRead, operation_id="recordObservation")
async def record_observation(
    case_id: UUID, data: ObservationInput, session: Session, request: Request
) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    if len(state.observations) >= settings_for(request).review_max_observations:
        raise AppError("workspace_limit", "The configured observation limit was reached.", 422)
    service.add_observation(state, data)
    await service.save(session, case_id, state, data.revision)
    return output(state)


@router.post(
    "/observations/{observation_id}/verify",
    response_model=WorkspaceRead,
    operation_id="verifyObservation",
)
async def verify_observation(
    case_id: UUID, observation_id: UUID, data: VerifyInput, session: Session
) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    service.verify_observation(state, observation_id, data.reason)
    await service.save(session, case_id, state, data.revision)
    return output(state)


@router.post(
    "/fields/{field}/selection", response_model=WorkspaceRead, operation_id="selectCanonicalValue"
)
async def select_canonical(
    case_id: UUID, field: str, data: SelectionInput, session: Session
) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    service.select_value(state, field, data)
    await service.save(session, case_id, state, data.revision)
    return output(state)


@router.post("/template", response_model=WorkspaceRead, operation_id="registerExcelTemplate")
async def register_template(
    case_id: UUID, data: TemplateInput, session: Session, request: Request
) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    await service.set_template(
        state, data, storage(request), settings_for(request).review_max_file_bytes
    )
    await service.save(session, case_id, state, data.revision)
    return output(state)


@router.post("/approve", response_model=WorkspaceRead, operation_id="approveReviewRevision")
async def approve(case_id: UUID, data: VerifyInput, session: Session) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    if not evaluate(state).eligible:
        raise AppError(
            "export_not_ready",
            "Required fields, source reviews or template mappings are unresolved.",
            409,
        )
    service.audit(state, "revision_approved", f"revision={state.revision}; {data.reason}")
    await service.save(session, case_id, state, data.revision, preserve_approval=True)
    return output(state)


@router.post("/exports", response_model=WorkspaceRead, operation_id="createExcelExport")
async def create_export(
    case_id: UUID, data: Revision, session: Session, request: Request
) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    await service.export_excel(state, storage(request))
    await service.save(session, case_id, state, data.revision, preserve_approval=True)
    return output(state)


@router.post("/draft-exports", response_model=WorkspaceRead, operation_id="createDraftExcelExport")
async def create_draft_export(
    case_id: UUID, data: DraftExportInput, session: Session, request: Request
) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    was_approved = evaluate(state).approved
    await service.export_draft(state, storage(request), data.reason)
    await service.save(session, case_id, state, data.revision, preserve_approval=was_approved)
    return output(state)


@router.get("/exports/{export_id}/content", operation_id="downloadExcelExport")
async def download_export(
    case_id: UUID, export_id: UUID, session: Session, request: Request
) -> Response:
    state = await service.load(session, case_id)
    record = next((item for item in state.exports if item.id == export_id), None)
    if record is None:
        raise AppError("export_not_found", "Export not found in this case.", 404)
    content = await asyncio.to_thread(storage(request).read, record.storage_key)
    return Response(
        content,
        media_type=(
            "application/vnd.ms-excel"
            if record.filename.lower().endswith(".xls")
            else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": f'attachment; filename="{record.filename}"',
            "Cache-Control": "no-store",
        },
    )


@router.post(
    "/observations/{observation_id}/correct",
    response_model=WorkspaceRead,
    operation_id="correctObservation",
)
async def correct_observation(
    case_id: UUID, observation_id: UUID, data: CorrectionInput, session: Session, request: Request
) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    if len(state.observations) >= settings_for(request).review_max_observations:
        raise AppError("workspace_limit", "The observation limit was reached.", 422)
    revisions.correct_observation(state, observation_id, data)
    await service.save(session, case_id, state, data.revision)
    return output(state)


@router.post(
    "/observations/{observation_id}/withdraw",
    response_model=WorkspaceRead,
    operation_id="withdrawObservation",
)
async def withdraw_observation(
    case_id: UUID, observation_id: UUID, data: VerifyInput, session: Session
) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    revisions.withdraw_observation(state, observation_id, data.reason)
    await service.save(session, case_id, state, data.revision)
    return output(state)


@router.post(
    "/documents/{document_id}/withdraw",
    response_model=WorkspaceRead,
    operation_id="withdrawReviewDocument",
)
async def withdraw_document(
    case_id: UUID, document_id: UUID, data: VerifyInput, session: Session
) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    revisions.withdraw_document(state, document_id, data.reason)
    await service.save(session, case_id, state, data.revision)
    return output(state)


@router.post(
    "/documents/{document_id}/replace",
    response_model=WorkspaceRead,
    operation_id="replaceReviewDocument",
)
async def replace_document(
    case_id: UUID, document_id: UUID, data: ReplacementInput, session: Session, request: Request
) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    settings = settings_for(request)
    if len(state.documents) >= settings.review_max_documents:
        raise AppError("workspace_limit", "The document limit was reached.", 422)
    revisions.withdraw_document(state, document_id, data.reason)
    await service.add_document(
        state, data, storage(request), settings.review_max_file_bytes, settings.review_max_pdf_pages
    )
    previous = next(item for item in state.documents if item.id == document_id)
    previous.replaced_by = state.documents[-1].id
    service.audit(
        state, "document_replaced", f"{document_id} -> {previous.replaced_by}; {data.reason}"
    )
    await service.save(session, case_id, state, data.revision)
    return output(state)


@router.post("/policy", response_model=WorkspaceRead, operation_id="adoptReviewPolicy")
async def adopt_policy(case_id: UUID, data: PolicyInput, session: Session) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    case = await get_case(session, case_id)
    if data.policy.procedures and case.procedure not in data.policy.procedures:
        raise AppError(
            "policy_scope_mismatch", "This policy does not cover the case procedure.", 422
        )
    if state.policy != data.policy:
        state.applicability.clear()
    revisions.adopt_policy(state, data)
    await service.save(session, case_id, state, data.revision)
    return output(state)


@router.post(
    "/logical-documents", response_model=WorkspaceRead, operation_id="classifyReviewDocument"
)
async def classify_document(
    case_id: UUID, data: LogicalDocumentInput, session: Session
) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    revisions.classify_document(state, data)
    await service.save(session, case_id, state, data.revision)
    return output(state)


@router.post(
    "/logical-documents/{logical_id}/withdraw",
    response_model=WorkspaceRead,
    operation_id="withdrawLogicalDocument",
)
async def withdraw_logical(
    case_id: UUID, logical_id: UUID, data: VerifyInput, session: Session
) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    item = next(
        (item for item in state.logical_documents if item.id == logical_id and not item.withdrawn),
        None,
    )
    if item is None:
        raise AppError("source_not_found", "Active logical document not found.", 404)
    item.withdrawn = True
    service.audit(state, "logical_document_withdrawn", f"{logical_id}; {data.reason}")
    await service.save(session, case_id, state, data.revision)
    return output(state)


@router.get(
    "/extractions",
    response_model=list[extraction.ExtractionRun],
    operation_id="listReviewExtractions",
)
async def list_extractions(case_id: UUID, session: Session) -> list[extraction.ExtractionRun]:
    state = await service.load(session, case_id)
    jobs = await session.scalars(
        select(ProcessingJob)
        .where(
            ProcessingJob.kind == extraction.JOB_KIND,
            ProcessingJob.payload["case_id"].as_string() == str(case_id),
        )
        .order_by(ProcessingJob.created_at.desc())
        .limit(20)
    )
    return [extraction.describe(job, state) for job in jobs]


@router.post(
    "/extractions",
    response_model=extraction.ExtractionRun,
    status_code=202,
    operation_id="startReviewExtraction",
)
async def start_extraction(
    case_id: UUID, data: extraction.ExtractionInput, session: Session, request: Request
) -> extraction.ExtractionRun:
    state = await current(session, case_id, data.revision)
    payload = extraction.prepare(state, data, settings_for(request))
    payload["case_id"] = str(case_id)
    job_id = await request.app.state.jobs.submit(extraction.JOB_KIND, payload, deduplicate=True)
    job = await session.get(ProcessingJob, job_id)
    assert job is not None
    return extraction.describe(job, state)


@router.post(
    "/extractions/{job_id}/apply",
    response_model=WorkspaceRead,
    operation_id="applyReviewExtraction",
)
async def apply_extraction(
    case_id: UUID, job_id: UUID, data: Revision, session: Session, request: Request
) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    job = await session.get(ProcessingJob, job_id)
    if job is None or job.kind != extraction.JOB_KIND or job.payload.get("case_id") != str(case_id):
        raise AppError("source_not_found", "Extraction not found in this case.", 404)
    extraction.apply(state, job, settings_for(request).review_max_observations)
    await service.save(session, case_id, state, data.revision)
    return output(state)


@router.post("/stage", response_model=WorkspaceRead, operation_id="setReviewStage")
async def set_stage(case_id: UUID, data: StageInput, session: Session) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    state.stage = data.stage
    service.audit(state, "stage_changed", f"{data.stage}; {data.reason}")
    await service.save(session, case_id, state, data.revision)
    return output(state)


@router.post(
    "/applicability/{key}", response_model=WorkspaceRead, operation_id="setDocumentApplicability"
)
async def set_applicability(
    case_id: UUID, key: str, data: ApplicabilityInput, session: Session
) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    if not state.policy or not any(
        rule.key == key and rule.when == "applicable" for rule in state.policy.document_requirements
    ):
        raise AppError("invalid_policy", "Choose a conditional rule in the active policy.", 422)
    state.applicability[key] = Applicability(status=data.status, reason=data.reason)
    service.audit(state, "applicability_confirmed", f"{key}; {data.status}; {data.reason}")
    await service.save(session, case_id, state, data.revision)
    return output(state)


@router.post(
    "/fields/{field}/canonical", response_model=WorkspaceRead, operation_id="editConsolidatedValue"
)
async def edit_consolidated(
    case_id: UUID, field: str, data: CanonicalInput, session: Session
) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    service.edit_canonical(state, field, data)
    await service.save(session, case_id, state, data.revision)
    return output(state)


@router.post(
    "/fields/{field}/canonical/withdraw",
    response_model=WorkspaceRead,
    operation_id="withdrawConsolidatedValue",
)
async def withdraw_consolidated(
    case_id: UUID, field: str, data: VerifyInput, session: Session
) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    value = state.canonical_values.pop(field, None)
    if value is None:
        raise AppError("source_not_found", "No manual value exists for this field.", 404)
    state.canonical_history.append({field: value})
    service.audit(state, "canonical_value_withdrawn", f"{field}; {data.reason}")
    await service.save(session, case_id, state, data.revision)
    return output(state)


@router.post(
    "/documents/{document_id}/transcript",
    response_model=WorkspaceRead,
    operation_id="recordPageTranscript",
)
async def transcript(
    case_id: UUID, document_id: UUID, data: TranscriptInput, session: Session
) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    document = next(
        (item for item in state.documents if item.id == document_id and not item.withdrawn), None
    )
    if not document or data.page > len(document.pages):
        raise AppError("source_not_found", "Active source page not found.", 404)
    if document.pages[data.page - 1].strip():
        raise AppError(
            "transcript_not_required", "Manual transcripts are reserved for unreadable pages.", 422
        )
    if any(
        item.document_id == document_id and item.page == data.page and item.state == "active"
        for item in state.observations
    ):
        raise AppError(
            "transcript_in_use",
            "Withdraw existing page observations before changing the transcript.",
            409,
        )
    if not data.text.strip():
        raise AppError("invalid_canonical_value", "Page text cannot be blank.", 422)
    previous_text = document.transcripts.get(data.page)
    if previous_text is not None:
        document.transcript_history.setdefault(data.page, []).append(previous_text)
    document.transcripts[data.page] = data.text
    service.audit(state, "page_transcribed", f"{document_id}; page={data.page}; {data.reason}")
    await service.save(session, case_id, state, data.revision)
    return output(state)


@router.post(
    "/template-profile", response_model=WorkspaceRead, operation_id="applyExcelTemplateProfile"
)
async def apply_template_profile(
    case_id: UUID, data: template_library.ProfileInput, session: Session, request: Request
) -> WorkspaceRead:
    state = await current(session, case_id, data.revision)
    await template_library.apply_profile(
        state, data, session, storage(request), settings_for(request).review_max_file_bytes
    )
    await service.save(session, case_id, state, data.revision)
    return output(state)


@router.post(
    "/extractions/{job_id}/retry",
    response_model=extraction.ExtractionRun,
    status_code=202,
    operation_id="retryReviewExtraction",
)
async def retry_extraction(
    case_id: UUID, job_id: UUID, data: Revision, session: Session, request: Request
) -> extraction.ExtractionRun:
    state = await current(session, case_id, data.revision)
    previous = await session.get(ProcessingJob, job_id)
    if (
        previous is None
        or previous.kind != extraction.JOB_KIND
        or previous.payload.get("case_id") != str(case_id)
    ):
        raise AppError("source_not_found", "Extraction not found in this case.", 404)
    if (
        previous.status not in {"failed", "interrupted", "succeeded"}
        or job_id in state.applied_extractions
    ):
        raise AppError(
            "extraction_retry_unavailable",
            "Only unapplied, completed requests can be retried explicitly.",
            409,
        )
    extraction_input = extraction.ExtractionInput.model_validate(
        {
            key: state.revision if key == "revision" else previous.payload[key]
            for key in ("revision", "document_id", "fields")
        }
    )
    payload = extraction.prepare(state, extraction_input, settings_for(request))
    payload["case_id"] = str(case_id)
    new_id = await request.app.state.jobs.submit(extraction.JOB_KIND, payload, deduplicate=True)
    job = await session.get(ProcessingJob, new_id)
    assert job is not None
    return extraction.describe(job, state)
