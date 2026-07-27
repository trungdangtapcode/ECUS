"""Corrections preserve old evidence and invalidate dependent canonical selections."""

from uuid import UUID, uuid4

from ecus_api.core.errors import AppError
from ecus_api.modules.review import service
from ecus_api.modules.review.schemas import (
    CorrectionInput,
    LogicalDocument,
    LogicalDocumentInput,
    Observation,
    PolicyInput,
    Workspace,
)


def active_observation(state: Workspace, observation_id: UUID) -> Observation:
    item = next(
        (
            item
            for item in state.observations
            if item.id == observation_id and item.state == "active"
        ),
        None,
    )
    if item is None:
        raise AppError("source_not_found", "Active observation not found.", 404)
    return item


def withdraw_observation(state: Workspace, observation_id: UUID, reason: str) -> None:
    item = active_observation(state, observation_id)
    item.state = "withdrawn"
    item.change_reason = reason
    state.selections.pop(item.field, None)
    service.audit(state, "observation_withdrawn", f"{item.id}; {reason}")


def correct_observation(state: Workspace, observation_id: UUID, data: CorrectionInput) -> None:
    previous = active_observation(state, observation_id)
    previous.state = "superseded"
    # Corrections must be verified again, even if the browser submits verified=true.
    corrected = service.add_observation(state, data.model_copy(update={"verified": False}))
    previous.replacement_id = corrected.id
    previous.change_reason = data.reason
    state.selections.pop(previous.field, None)
    service.audit(state, "observation_corrected", f"{previous.id} -> {corrected.id}; {data.reason}")


def withdraw_document(state: Workspace, document_id: UUID, reason: str) -> None:
    document = next(
        (item for item in state.documents if item.id == document_id and not item.withdrawn), None
    )
    if document is None:
        raise AppError("source_not_found", "Active document not found.", 404)
    document.withdrawn = True
    document.withdrawal_reason = reason
    for item in state.observations:
        if item.document_id == document_id and item.state == "active":
            withdraw_observation(state, item.id, reason)
    service.audit(state, "document_withdrawn", f"{document_id}; {reason}")


def adopt_policy(state: Workspace, data: PolicyInput) -> None:
    if any(
        previous.version == data.policy.version and previous != data.policy
        for previous in state.policy_history
    ):
        raise AppError("version_conflict", "Changed rules require a new policy version.", 409)
    state.policy = data.policy.model_copy(deep=True)
    if state.policy not in state.policy_history:
        state.policy_history.append(state.policy.model_copy(deep=True))
    service.audit(state, "policy_adopted", f"{data.policy.version}; {data.reason}")


def classify_document(state: Workspace, data: LogicalDocumentInput) -> None:
    document = next(
        (item for item in state.documents if item.id == data.document_id and not item.withdrawn),
        None,
    )
    if document is None or not 1 <= data.page_from <= data.page_to <= len(document.pages):
        raise AppError("source_not_found", "Choose an existing source page range.", 422)
    if any(
        item.document_id == data.document_id
        and item.document_type == data.document_type
        and item.page_from == data.page_from
        and item.page_to == data.page_to
        for item in state.logical_documents
    ):
        raise AppError("duplicate_observation", "This logical document is already recorded.", 409)
    state.logical_documents.append(
        LogicalDocument(id=uuid4(), **data.model_dump(exclude={"revision"}))
    )
    service.audit(
        state,
        "logical_document_recorded",
        f"{data.document_id}; {data.document_type}; {data.page_from}-{data.page_to}; {data.reason}",
    )
