"""Evidence fingerprints and deterministic limits on semantic AI proposals."""

import hashlib
import json
import re
from decimal import Decimal

from ecus_api.modules.review.schemas import Observation, ReviewedReconciliationDecision, Workspace


def field_fingerprint(state: Workspace, field: str) -> str:
    documents = {item.id: item for item in state.documents if not item.withdrawn}
    sources = []
    for item in state.observations:
        if item.field != field or item.state != "active" or item.document_id not in documents:
            continue
        document = documents[item.document_id]
        page = document.transcripts.get(
            item.page,
            document.ocr_pages[item.page].text
            if item.page in document.ocr_pages
            else document.pages[item.page - 1],
        )
        sources.append(
            {
                "id": str(item.id),
                "document_id": str(item.document_id),
                "document_type": item.document_type,
                "page": item.page,
                "page_digest": hashlib.sha256(page.encode()).hexdigest(),
                "quote": item.quote,
                "offset": item.offset,
                "value": item.normalized,
                "unit": item.unit,
                "value_type": item.value_type,
            }
        )
    payload = {
        "documents": sorted((str(item.id), item.storage_key) for item in documents.values()),
        "sources": sources,
        "rule": next(
            (rule.model_dump() for rule in state.policy.fields if rule.field == field), None
        )
        if state.policy
        else None,
        "classifications": [
            (str(item.document_id), item.document_type, item.page_from, item.page_to)
            for item in state.logical_documents
            if not item.withdrawn and item.document_id in documents
        ],
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


def current_decision(state: Workspace, field: str) -> ReviewedReconciliationDecision | None:
    batch = state.ai_reconciliation
    decision = (
        next((item for item in batch.decisions if item.field == field), None) if batch else None
    )
    return (
        decision
        if decision and decision.source_fingerprint == field_fingerprint(state, field)
        else None
    )


def unit_key(unit: str) -> str:
    value = unit.strip().upper()
    return {"KGS": "KG", "KGM": "KG", "BOXES": "BOX", "ĐỒNG": "VND", "DONG": "VND"}.get(
        value, value
    )


def equivalence_guard(
    field: str, sources: list[Observation], *, port_scope_supported: bool = False
) -> str | None:
    if len({unit_key(item.unit) for item in sources}) != 1:
        return "unit_difference"
    if len({item.value_type for item in sources}) != 1:
        return "value_type_difference"
    if sources[0].value_type == "decimal":
        if len({Decimal(item.normalized) for item in sources}) != 1:
            return "numeric_difference"
        return None
    numbers: set[tuple[str, ...]]
    if "phone" in field or "telephone" in field:
        numbers = {(re.sub(r"\D", "", item.normalized),) for item in sources}
    else:
        numbers = {tuple(re.findall(r"\d+", item.normalized)) for item in sources}
    if len(numbers) != 1:
        return "numeric_difference"
    critical = (
        re.search(
            r"(?:^|_)(?:id|number|code|seal|container|vessel|voyage|port|location|destination|hs)(?:_|$)",
            field,
        )
        or field == "bill_of_lading"
    )
    if (
        critical
        and not port_scope_supported
        and len({re.sub(r"\W", "", item.normalized).casefold() for item in sources}) != 1
    ):
        return "critical_fact_difference"
    return None
