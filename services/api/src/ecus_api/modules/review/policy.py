"""Versioned, case-bound review configuration; no customer rules in application code."""

from decimal import Decimal
from typing import Annotated, Literal

from pydantic import Field, StringConstraints, field_validator, model_validator

from ecus_api.modules.review.schemas_base import Contract

DocumentType = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]


class FieldRule(Contract):
    field: str = Field(pattern=r"^[a-z][a-z0-9_]{0,63}$")
    label: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=2000)
    value_type: Literal["text", "decimal"] = "text"
    normalization: Literal["exact", "text", "identifier", "date", "currency"] = "exact"
    unit: str = Field(default="", max_length=20)
    required: bool = True
    preferred_sources: list[DocumentType] = Field(default_factory=list, max_length=20)

    @field_validator("unit")
    @classmethod
    def canonical_unit(cls, value: str) -> str:
        value = value.strip().upper()
        if value in {"MT", "T", "TONNE", "KGS", "KGM"}:
            return "KG"
        return value


class DocumentRequirement(Contract):
    key: str = Field(pattern=r"^[a-z][a-z0-9_]{0,63}$")
    label: str = Field(min_length=1, max_length=160)
    any_of: list[DocumentType] = Field(min_length=1, max_length=20)
    when: Literal["always", "arrival_confirmed", "applicable"] = "always"


class ArithmeticRule(Contract):
    key: str = Field(pattern=r"^[a-z][a-z0-9_]{0,63}$")
    label: str = Field(min_length=1, max_length=160)
    factors: list[str] = Field(min_length=2, max_length=2)
    result_field: str = Field(pattern=r"^[a-z][a-z0-9_]{0,63}$")
    decimal_places: int = Field(default=2, ge=0, le=8)
    tolerance: Decimal = Field(default=Decimal("0"), ge=0, allow_inf_nan=False)


class ReviewPolicy(Contract):
    arithmetic_checks: list[ArithmeticRule] = Field(default_factory=list, max_length=100)
    procedures: list[DocumentType] = Field(default_factory=list, max_length=30)
    document_requirements: list[DocumentRequirement] = Field(default_factory=list, max_length=30)
    version: str = Field(pattern=r"^[a-zA-Z0-9_-]{1,80}$")
    name: str = Field(min_length=1, max_length=160)
    status: Literal["proposal", "project_baseline"] = "proposal"
    required_documents: list[DocumentType] = Field(default_factory=list, max_length=30)
    fields: list[FieldRule] = Field(default_factory=list, max_length=2000)

    @model_validator(mode="after")
    def unique_fields(self) -> "ReviewPolicy":
        fields = {rule.field: rule for rule in self.fields}
        if len({rule.key for rule in self.arithmetic_checks}) != len(self.arithmetic_checks):
            raise ValueError("Arithmetic check keys must be unique")
        for check in self.arithmetic_checks:
            if any(
                field not in fields or fields[field].value_type != "decimal"
                for field in [*check.factors, check.result_field]
            ):
                raise ValueError("Arithmetic checks require configured decimal fields")
        if len({rule.key for rule in self.document_requirements}) != len(
            self.document_requirements
        ):
            raise ValueError("Document requirement keys must be unique")
        if len({rule.field for rule in self.fields}) != len(self.fields):
            raise ValueError("Field identifiers must be unique")
        if any(not item.strip() for item in self.required_documents):
            raise ValueError("Document types must not be blank")
        return self
