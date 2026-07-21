from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CaseCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    reference: str = Field(min_length=1, max_length=40, pattern=r"^[A-Za-z0-9][A-Za-z0-9._/-]*$")
    title: str = Field(min_length=1, max_length=200)
    procedure: str = Field(min_length=1, max_length=20)

    @field_validator("reference")
    @classmethod
    def normalize_reference(cls, value: str) -> str:
        return value.upper()


class CaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    reference: str
    title: str
    procedure: str
    status: Literal["draft"]
    created_at: datetime


class CasePage(BaseModel):
    items: list[CaseRead]
    total: int
    limit: int
    offset: int
