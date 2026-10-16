from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, field_validator

from ecus_api.modules.review.policy import ReviewPolicy
from ecus_api.modules.review.schemas_base import Contract

ComparisonStatus = Literal[
    "MATCH",
    "MISMATCH",
    "NOT_COMPARABLE",
    "NEEDS_REVIEW",
    "MISSING_REQUIRED",
    "EXTRACTION_UNCERTAIN",
]


class Revision(Contract):
    revision: int = Field(ge=0)


class Upload(Revision):
    filename: str = Field(min_length=1, max_length=200)
    content_base64: str = Field(min_length=1, max_length=35_000_000)


class Document(Contract):
    ocr_pages: dict[int, "OCRPage"] = Field(default_factory=dict)
    withdrawn: bool = False
    withdrawal_reason: str | None = None
    replaced_by: UUID | None = None
    id: UUID
    filename: str
    storage_key: str
    pages: list[str]
    transcripts: dict[int, str] = Field(default_factory=dict)
    transcript_history: dict[int, list[str]] = Field(default_factory=dict)


class OCRWord(Contract):
    text: str
    offset: int
    confidence: float
    box: list[float] = Field(min_length=4, max_length=4)


class OCRPage(Contract):
    is_blank: bool = False
    text: str
    words: list[OCRWord]
    confidence: float
    rotation: int = 0


class ObservationInput(Revision):
    field: str = Field(pattern=r"^[a-z][a-z0-9_]{0,63}$")
    document_id: UUID
    document_type: str = Field(min_length=1, max_length=80)
    page: int = Field(ge=1)
    source_offset: int | None = Field(default=None, ge=0)
    quote: str = Field(min_length=1, max_length=2000)
    value_type: Literal["text", "decimal"] = "text"
    unit: str = Field(default="", max_length=20)
    number_locale: Literal["en", "vi"] = "en"
    verified: bool = False

    @field_validator("quote")
    @classmethod
    def nonblank_quote(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Source quote must not be blank")
        return value


class Observation(Contract):
    line_identity_quote: str | None = None
    primary_line_source_ids: list[UUID] = Field(default_factory=list)
    source_kind: Literal["pdf_text", "human_transcript", "ocr"] = "pdf_text"
    source_unit: str | None = None
    number_locale: Literal["en", "vi"] = "en"
    extraction_confidence: float | None = None
    state: Literal["active", "withdrawn", "superseded"] = "active"
    replacement_id: UUID | None = None
    change_reason: str | None = None
    origin: Literal["manual", "ai"] = "manual"
    extraction_run_id: UUID | None = None
    id: UUID
    field: str
    document_id: UUID
    document_type: str
    page: int
    quote: str
    offset: int
    normalized: str
    value_type: Literal["text", "decimal"]
    unit: str
    verified: bool


class VerifyInput(Revision):
    reason: str = Field(min_length=1, max_length=2000)

    @field_validator("reason")
    @classmethod
    def reason_required(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("A reason is required")
        return value.strip()


class CorrectionInput(ObservationInput, VerifyInput):
    pass


class ReplacementInput(Upload, VerifyInput):
    pass


class PolicyInput(VerifyInput):
    policy: ReviewPolicy


class LogicalDocumentInput(VerifyInput):
    document_id: UUID
    document_type: str = Field(min_length=1, max_length=80)
    page_from: int = Field(ge=1)
    page_to: int = Field(ge=1)


class LogicalDocument(Contract):
    verified: bool = True
    origin: Literal["manual", "ai"] = "manual"
    confidence: float | None = None
    withdrawn: bool = False
    id: UUID
    document_id: UUID
    document_type: str
    page_from: int
    page_to: int
    reason: str


class SelectionInput(VerifyInput):
    observation_id: UUID


class Selection(Contract):
    observation_id: UUID
    reason: str


class Mapping(Contract):
    field: str = Field(pattern=r"^[a-z][a-z0-9_]{0,63}$")
    sheet: str = Field(min_length=1, max_length=31)
    cell: str = Field(pattern=r"^[A-Z]{1,3}[1-9][0-9]{0,6}$")
    required: bool = True


class CanonicalInput(VerifyInput):
    reviewed: bool = False
    source_observation_id: UUID | None = None
    value: str = Field(min_length=1, max_length=2000)
    number_locale: Literal["en", "vi"] = "en"


class CanonicalValue(Contract):
    ai_reconciliation_id: UUID | None = None
    reviewed: bool = False
    source_observation_id: UUID | None = None
    value: str
    value_type: Literal["text", "decimal"]
    unit: str
    reason: str
    source_ids: list[UUID]
    source_fingerprint: str
    at: datetime
    actor: str = "local-operator"


class TranscriptInput(VerifyInput):
    page: int = Field(ge=1)
    text: str = Field(min_length=1, max_length=100_000)


class ConfirmFieldsInput(VerifyInput):
    fields: list[str] = Field(min_length=1, max_length=2000)


class TemplateInput(Upload):
    version: str = Field(min_length=1, max_length=80)
    mapping_version: str = Field(min_length=1, max_length=80)
    mappings: list[Mapping] = Field(min_length=1, max_length=2000)


class Template(Contract):
    missing_values: Literal["block", "highlight"] = "block"
    profile_id: str | None = None
    repeat_counts: dict[str, int] = Field(default_factory=dict)
    filename: str
    storage_key: str
    version: str
    mapping_version: str
    mappings: list[Mapping]


class AuditEvent(Contract):
    id: UUID
    at: datetime
    actor: str = "local-operator"
    action: str
    detail: str


class StageInput(VerifyInput):
    stage: Literal["pre_arrival", "arrival_confirmed"]


class ApplicabilityInput(VerifyInput):
    status: Literal["unknown", "applicable", "not_applicable"]


class Applicability(Contract):
    status: Literal["unknown", "applicable", "not_applicable"]
    reason: str


class ExportRecord(Contract):
    ai_reconciliation_snapshot: "ReconciliationBatch | None" = None
    kind: Literal["approved", "draft"] = "approved"
    blockers_snapshot: list[str] = Field(default_factory=list)
    annotation_fields: list[str] = Field(default_factory=list)
    reason: str = ""
    observations_snapshot: list[Observation] = Field(default_factory=list)
    ocr_snapshot: dict[UUID, dict[int, OCRPage]] = Field(default_factory=dict)
    canonical_snapshot: dict[str, CanonicalValue] = Field(default_factory=dict)
    transcript_snapshot: dict[UUID, dict[int, str]] = Field(default_factory=dict)
    values_snapshot: dict[str, str | None] = Field(default_factory=dict)
    missing_fields: list[str] = Field(default_factory=list)
    stage: Literal["pre_arrival", "arrival_confirmed"] = "pre_arrival"
    applicability_snapshot: dict[str, Applicability] = Field(default_factory=dict)
    logical_documents_snapshot: list[LogicalDocument] = Field(default_factory=list)
    policy_snapshot: ReviewPolicy | None = None
    mapping_snapshot: list[Mapping] = Field(default_factory=list)
    selected_observations: dict[str, UUID] = Field(default_factory=dict)
    id: UUID
    at: datetime
    filename: str
    storage_key: str
    source_revision: int
    template_version: str
    mapping_version: str


class DraftExportInput(VerifyInput):
    locale: Literal["en", "vi"] = "vi"


class ReconciliationDecision(Contract):
    field: str = Field(pattern=r"^[a-z][a-z0-9_]{0,63}$")
    classification: Literal["equivalent", "different", "uncertain"]
    source_ids: list[UUID] = Field(min_length=1, max_length=5000)
    source_observation_id: UUID | None = None
    proposed_value: str | None = Field(default=None, min_length=1, max_length=2000)
    reason: str = Field(min_length=1, max_length=2000)


class ReviewedReconciliationDecision(ReconciliationDecision):
    source_fingerprint: str
    guard_code: str | None = None


class ReconciliationBatch(Contract):
    id: UUID
    fingerprint: str
    source_revision: int
    locale: Literal["en", "vi"]
    model: str
    prompt_version: str
    trace_id: str | None = None
    provider_request_id: str | None = None
    at: datetime
    decisions: list[ReviewedReconciliationDecision]


class Workspace(Contract):
    ai_reconciliation: ReconciliationBatch | None = None
    canonical_values: dict[str, CanonicalValue] = Field(default_factory=dict)
    canonical_history: list[dict[str, CanonicalValue]] = Field(default_factory=list)
    stage: Literal["pre_arrival", "arrival_confirmed"] = "pre_arrival"
    applicability: dict[str, Applicability] = Field(default_factory=dict)
    applied_extractions: list[UUID] = Field(default_factory=list)
    policy: ReviewPolicy | None = None
    policy_history: list[ReviewPolicy] = Field(default_factory=list)
    logical_documents: list[LogicalDocument] = Field(default_factory=list)
    revision: int = 0
    documents: list[Document] = Field(default_factory=list)
    observations: list[Observation] = Field(default_factory=list)
    selections: dict[str, Selection] = Field(default_factory=dict)
    template: Template | None = None
    template_history: list[Template] = Field(default_factory=list)
    approved_revision: int | None = None
    audit: list[AuditEvent] = Field(default_factory=list)
    exports: list[ExportRecord] = Field(default_factory=list)


class Comparison(Contract):
    semantic_review: ReviewedReconciliationDecision | None = None
    source_values_differ: bool = False
    consistent: bool = False
    canonical: CanonicalValue | None = None
    canonical_stale: bool = False
    resolved: bool = False
    field: str
    status: ComparisonStatus
    observations: list[Observation]
    selection: Selection | None


class ArithmeticResult(Contract):
    key: str
    label: str
    factors: list[str]
    result_field: str
    status: Literal["MATCH", "MISMATCH", "NOT_COMPARABLE"]
    values: list[str] = Field(default_factory=list)
    expected: str | None = None
    actual: str | None = None
    difference: str | None = None
    tolerance: str


class Readiness(Contract):
    arithmetic_checks: list[ArithmeticResult] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    revision: int
    eligible: bool
    approved: bool
    blockers: list[str]
    comparisons: list[Comparison]


class WorkspaceRead(Contract):
    workspace: Workspace
    readiness: Readiness
