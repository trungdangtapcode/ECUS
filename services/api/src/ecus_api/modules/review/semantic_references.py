"""Select curated address transitions and scoped port/terminal relationships."""

import hashlib
import re
import unicodedata

from pydantic import ValidationError

from ecus_api.core.config import Settings
from ecus_api.core.errors import AppError
from ecus_api.modules.review.schemas import (
    AddressTransition,
    Observation,
    PortRelation,
    ReconciliationReferences,
)


def load(settings: Settings) -> ReconciliationReferences:
    try:
        return ReconciliationReferences.model_validate_json(
            settings.reconciliation_reference_path.read_bytes()
        )
    except (OSError, ValidationError) as error:
        raise AppError(
            "reconciliation_reference_unavailable", "Semantic reference data is unavailable.", 503
        ) from error


def digest(settings: Settings) -> str:
    references = load(settings)
    return hashlib.sha256(references.model_dump_json().encode()).hexdigest()


def text_key(value: str) -> str:
    folded = unicodedata.normalize("NFKD", value.casefold().replace("đ", "d"))
    return " ".join(
        re.findall(r"[a-z0-9]+", "".join(c for c in folded if not unicodedata.combining(c)))
    )


def matching_addresses(
    field: str, sources: list[Observation], references: ReconciliationReferences
) -> list[AddressTransition]:
    if "address" not in field:
        return []
    values = [f" {text_key(source.normalized)} " for source in sources]

    def contains(value: str, aliases: list[str]) -> bool:
        return any(f" {text_key(alias)} " in value for alias in aliases)

    return [
        reference
        for reference in references.addresses
        if all(contains(value, reference.region_aliases) for value in values)
        and any(contains(value, reference.old_aliases) for value in values)
        and any(contains(value, reference.new_aliases) for value in values)
    ]


def matching_ports(
    field: str, sources: list[Observation], references: ReconciliationReferences
) -> list[PortRelation]:
    values = {text_key(source.normalized) for source in sources}
    return [
        reference
        for reference in references.ports
        if field in reference.fields
        and values
        <= {text_key(alias) for alias in reference.port_aliases + reference.terminal_aliases}
        and values & {text_key(alias) for alias in reference.port_aliases}
        and values & {text_key(alias) for alias in reference.terminal_aliases}
    ]
