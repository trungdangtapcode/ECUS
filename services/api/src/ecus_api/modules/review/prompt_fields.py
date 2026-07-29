"""Give providers business descriptions while preserving stored policy identifiers."""

from pathlib import Path
from typing import Any

from pydantic import Field, ValidationError

from ecus_api.core.errors import AppError
from ecus_api.modules.review.policy import FieldRule
from ecus_api.modules.review.schemas_base import Contract


class FieldMeaning(Contract):
    label: str = Field(min_length=1, max_length=300)
    description: str = Field(default="", max_length=2000)


class FieldCatalog(Contract):
    version: str = Field(min_length=1, max_length=80)
    fields: dict[str, FieldMeaning]


def load_catalog(path: Path) -> FieldCatalog:
    try:
        return FieldCatalog.model_validate_json(path.read_text(encoding="utf-8"))
    except (OSError, ValidationError):
        raise AppError(
            "invalid_policy",
            "The configured extraction field catalog is unavailable or invalid.",
            422,
        ) from None


def requested_fields(rules: list[FieldRule], catalog: FieldCatalog) -> list[dict[str, Any]]:
    result = []
    for rule in rules:
        definition = rule.model_dump(mode="json")
        meaning = catalog.fields.get(rule.label)
        if meaning:
            definition.update(
                label=meaning.label, description=rule.description or meaning.description
            )
        elif rule.label.startswith("integration.fields."):
            # An unresolved UI key is not a readable field description.
            definition["label"] = rule.field.replace("_", " ")
        result.append(definition)
    return result
