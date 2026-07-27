import hashlib
import json
import re
import unicodedata
from collections import Counter
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation, localcontext
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ecus_api.modules.review.policy import FieldRule
    from ecus_api.modules.review.schemas import Observation

from ecus_api.core.errors import AppError
from ecus_api.modules.review.schemas import (
    ArithmeticResult,
    Comparison,
    ComparisonStatus,
    Document,
    Readiness,
    Workspace,
)


def normalize(quote: str, value_type: str, unit: str, locale: str) -> tuple[str, str]:
    if value_type == "text":
        return " ".join(quote.split()), unit.strip().upper()
    text = quote.strip().replace("\u00a0", "")
    pattern = (
        r"[+-]?(?:[0-9]+|[0-9]{1,3}(?:,[0-9]{3})+)(?:\.[0-9]+)?"
        if locale == "en"
        else r"[+-]?(?:[0-9]+|[0-9]{1,3}(?:\.[0-9]{3})+)(?:,[0-9]+)?"
    )
    if not re.fullmatch(pattern, text):
        raise AppError("invalid_numeric_source", "Select a number in the specified locale.", 422)
    text = text.replace(",", "") if locale == "en" else text.replace(".", "").replace(",", ".")
    try:
        value = Decimal(text)
        if not value.is_finite():
            raise InvalidOperation
    except InvalidOperation:
        raise AppError(
            "invalid_numeric_source", "Select a numeric source value and its locale.", 422
        ) from None
    canonical_unit = unit.strip().upper()
    # Standard mass conversions only. Packaging ratios require explicit evidence.
    if canonical_unit in {"MT", "T", "TONNE"}:
        value *= 1000
        canonical_unit = "KG"
    elif canonical_unit in {"KGS", "KGM"}:
        canonical_unit = "KG"
    return format(value, "f"), canonical_unit


def source_fingerprint(state: Workspace, field: str) -> str:
    # Include new/withdrawn documents and page transcripts, even before extraction.
    data = {
        "documents": [
            {
                "id": str(document.id),
                "key": document.storage_key,
                "withdrawn": document.withdrawn,
                "transcripts": document.transcripts,
                "ocr_pages": {page: value.text for page, value in document.ocr_pages.items()},
            }
            for document in state.documents
        ],
        "sources": [
            item.model_dump(mode="json") for item in state.observations if item.field == field
        ],
        "rule": next(
            (
                rule.model_dump(exclude={"description"} if not rule.description else set())
                for rule in state.policy.fields
                if rule.field == field
            ),
            None,
        )
        if state.policy
        else None,
    }
    return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()


def normalize_field(value: str, rule: "FieldRule", unit: str, locale: str) -> tuple[str, str]:
    normalized, canonical_unit = normalize(value, rule.value_type, unit, locale)
    if rule.value_type == "text" and rule.normalization == "date":
        formats = (
            "%Y-%m-%d",
            "%Y/%m/%d",
            "%d/%m/%Y",
            "%d-%m-%Y",
            "%d-%b-%Y",
            "%d %b %Y",
            "%b. %d, %Y",
            "%b %d, %Y",
            "%B %d, %Y",
        )
        for pattern in formats:
            try:
                return datetime.strptime(normalized, pattern).date().isoformat(), canonical_unit
            except ValueError:
                continue
        raise AppError("invalid_date_source", "Choose an explicit day-first or ISO date.", 422)
    if rule.value_type == "text" and rule.normalization == "currency":
        # A bare dollar sign is intentionally ambiguous; the operator must supply its currency.
        normalized = {"US$": "USD", "EURO": "EUR", "€": "EUR"}.get(
            normalized.upper(), normalized.upper()
        )
    return normalized, canonical_unit


def comparison_value(
    item: "Observation", rule: "FieldRule | None"
) -> tuple[str, str, str | Decimal]:
    value: str | Decimal = (
        Decimal(item.normalized) if item.value_type == "decimal" else item.normalized
    )
    if isinstance(value, str) and rule:
        value = unicodedata.normalize("NFC", value)
        if rule.normalization == "text":
            value = " ".join(re.sub(r"[^\w\s]", " ", value.casefold()).split())
        elif rule.normalization == "identifier":
            value = re.sub(r"[\s-]+", "", value).upper()
    return item.value_type, item.unit, value


def effective_pages(document: "Document") -> list[str]:
    return [
        document.transcripts.get(
            index + 1,
            document.ocr_pages[index + 1].text if index + 1 in document.ocr_pages else text,
        )
        for index, text in enumerate(document.pages)
    ]


def evaluate(state: Workspace) -> Readiness:
    required = (
        {mapping.field for mapping in state.template.mappings if mapping.required}
        if state.template
        else set()
    )
    if state.policy:
        required |= {rule.field for rule in state.policy.fields if rule.required}
    active_documents = {item.id for item in state.documents if not item.withdrawn}
    active = [
        item
        for item in state.observations
        if item.state == "active" and item.document_id in active_documents
    ]
    mapped = {mapping.field for mapping in state.template.mappings} if state.template else set()
    fields = sorted(
        required | mapped | {item.field for item in active} | set(state.canonical_values)
    )
    highlight_missing = bool(state.template and state.template.missing_values == "highlight")
    comparisons: list[Comparison] = []
    blockers: list[str] = []
    warnings: list[str] = []
    if not active_documents:
        blockers.append("documents_missing")
    for document in state.documents:
        if not document.withdrawn and (
            not any(page.strip() for page in effective_pages(document))
            or any(
                not page.strip()
                and not (document.ocr_pages.get(number) and document.ocr_pages[number].is_blank)
                for number, page in enumerate(effective_pages(document), 1)
            )
        ):
            blockers.append(f"{document.filename}:source_unreadable")
    if state.template is None:
        blockers.append("template_missing")
    if not state.policy:
        blockers.append("policy_missing")
    if state.policy:
        if state.policy.status == "proposal":
            blockers.append("policy_proposal")
        classified = {
            item.document_type
            for item in state.logical_documents
            if item.document_id in active_documents and not item.withdrawn and item.verified
        }
        if not state.policy.fields:
            blockers.append("fields_unconfigured")
        for requirement in state.policy.document_requirements:
            applies = requirement.when == "always" or (
                requirement.when == "arrival_confirmed" and state.stage == "arrival_confirmed"
            )
            if requirement.when == "applicable":
                decision = state.applicability.get(requirement.key)
                if decision is None or decision.status == "unknown":
                    blockers.append(f"{requirement.key}:applicability_unknown")
                applies = decision is not None and decision.status == "applicable"
            if applies and not classified.intersection(requirement.any_of):
                blockers.append(f"{requirement.key}:logical_document_missing")
        for kind in state.policy.required_documents:
            if kind not in classified:
                blockers.append(f"{kind}:logical_document_missing")
    if state.policy and state.template:
        mapped = {item.field for item in state.template.mappings}
        for required_rule in state.policy.fields:
            if required_rule.required and required_rule.field not in mapped:
                blockers.append(f"{required_rule.field}:template_mapping_missing")
    for field in fields:
        observations = [item for item in active if item.field == field]
        definition = (
            next((item for item in state.policy.fields if item.field == field), None)
            if state.policy
            else None
        )
        consistent = bool(
            observations
            and definition
            and len({comparison_value(item, definition) for item in observations}) == 1
            and all(
                item.value_type == definition.value_type
                and (not definition.unit or item.unit == definition.unit)
                for item in observations
            )
            and (
                not definition.preferred_sources
                or any(item.document_type in definition.preferred_sources for item in observations)
            )
            and any(
                not logical.withdrawn
                and logical.document_id == source.document_id
                and logical.document_type == source.document_type
                and logical.page_from <= source.page <= logical.page_to
                for source in observations
                for logical in state.logical_documents
            )
        )
        status: ComparisonStatus
        if not observations:
            status = "MISSING_REQUIRED" if field in required else "NOT_COMPARABLE"
        elif any(not item.verified for item in observations):
            status = "EXTRACTION_UNCERTAIN"
        elif len(observations) == 1:
            status = "NOT_COMPARABLE"
        else:
            rule = (
                next((item for item in state.policy.fields if item.field == field), None)
                if state.policy
                else None
            )
            values = [comparison_value(item, rule) for item in observations]
            groups = Counter(values).most_common()
            if len(groups) == 1:
                status = "MATCH"
            elif groups[0][1] == groups[1][1]:
                status = "NEEDS_REVIEW"
            else:
                status = "MISMATCH"
        selection = state.selections.get(field)
        chosen = next(
            (item for item in observations if selection and item.id == selection.observation_id),
            None,
        )
        canonical = state.canonical_values.get(field)
        stale = bool(canonical and canonical.source_fingerprint != source_fingerprint(state, field))
        override = canonical is not None and not stale
        if stale:
            blockers.append(f"{field}:canonical_edit_stale")
        if canonical and not canonical.reviewed:
            blockers.append(f"{field}:canonical_review_required")
        if status == "EXTRACTION_UNCERTAIN" and not (override and canonical and canonical.reviewed):
            blockers.append(f"{field}:{status}")
        elif not observations and not override:
            if highlight_missing or field not in required:
                warnings.append(f"{field}:missing_value")
            else:
                blockers.append(f"{field}:{status}")
        elif (
            not override
            and not chosen
            and (field in required or field in mapped or status in {"MISMATCH", "NEEDS_REVIEW"})
        ):
            blockers.append(f"{field}:selection_required")
        if state.policy:
            rule = next((rule for rule in state.policy.fields if rule.field == field), None)
            if rule:
                for item in [] if override else observations:
                    if item.value_type != rule.value_type or (rule.unit and item.unit != rule.unit):
                        blockers.append(f"{field}:field_rule_mismatch")
                        break
                if (
                    chosen
                    and not override
                    and not any(
                        not source.withdrawn
                        and source.verified
                        and source.document_id == chosen.document_id
                        and source.document_type == chosen.document_type
                        and source.page_from <= chosen.page <= source.page_to
                        for source in state.logical_documents
                    )
                ):
                    blockers.append(f"{field}:source_classification_required")
                if (
                    chosen
                    and not override
                    and rule.preferred_sources
                    and chosen.document_type not in rule.preferred_sources
                ):
                    blockers.append(f"{field}:source_exception_requires_review")
        comparisons.append(
            Comparison(
                source_values_differ=len(
                    {comparison_value(item, definition) for item in observations}
                )
                > 1,
                consistent=consistent,
                field=field,
                status=status,
                observations=observations,
                selection=selection,
                canonical=canonical,
                canonical_stale=stale,
                resolved=bool(
                    (override or chosen)
                    and not any(item.startswith(f"{field}:") for item in blockers)
                ),
            )
        )
    arithmetic_checks = evaluate_arithmetic(state, comparisons)
    for check in arithmetic_checks:
        if check.status == "MISMATCH":
            blockers.append(f"{check.result_field}:arithmetic_mismatch")
            for comparison in comparisons:
                if comparison.field == check.result_field:
                    comparison.resolved = False
    return Readiness(
        arithmetic_checks=arithmetic_checks,
        revision=state.revision,
        eligible=not blockers,
        approved=state.approved_revision == state.revision and not blockers,
        blockers=list(dict.fromkeys(blockers)),
        warnings=warnings,
        comparisons=comparisons,
    )


def evaluate_arithmetic(state: Workspace, comparisons: list[Comparison]) -> list[ArithmeticResult]:
    """Check current chosen values; reviewed corrections cannot bypass arithmetic."""
    if not state.policy:
        return []
    selected: dict[str, Decimal] = {}
    for comparison in comparisons:
        canonical = comparison.canonical
        if canonical and not comparison.canonical_stale and canonical.reviewed:
            if canonical.value_type == "decimal":
                selected[comparison.field] = Decimal(canonical.value)
        elif not canonical:
            observation = next(
                (
                    item
                    for item in comparison.observations
                    if comparison.selection
                    and item.id == comparison.selection.observation_id
                    and item.verified
                    and item.value_type == "decimal"
                ),
                None,
            )
            if observation:
                selected[comparison.field] = Decimal(observation.normalized)
    results = []
    for rule in state.policy.arithmetic_checks:
        result = ArithmeticResult(
            key=rule.key,
            label=rule.label,
            factors=rule.factors,
            result_field=rule.result_field,
            status="NOT_COMPARABLE",
            tolerance=format(rule.tolerance, "f"),
        )
        if all(field in selected for field in [*rule.factors, rule.result_field]):
            left, right = [selected[field] for field in rule.factors]
            actual = selected[rule.result_field]
            with localcontext() as context:
                context.prec = max(
                    28,
                    len(left.as_tuple().digits)
                    + len(right.as_tuple().digits)
                    + rule.decimal_places
                    + 2,
                )
                expected = (left * right).quantize(
                    Decimal(1).scaleb(-rule.decimal_places), rounding=ROUND_HALF_UP
                )
                difference = actual - expected
            result.values = [format(left, "f"), format(right, "f")]
            result.expected = format(expected, "f")
            result.actual = format(actual, "f")
            result.difference = format(difference, "f")
            result.status = "MATCH" if abs(difference) <= rule.tolerance else "MISMATCH"
        results.append(result)
    return results
