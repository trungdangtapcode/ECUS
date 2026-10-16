from dataclasses import dataclass
from typing import Any, Literal, Protocol, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


@dataclass(frozen=True)
class ImageInput:
    data: bytes
    mime_type: Literal["image/png", "image/jpeg", "image/webp"]


@dataclass(frozen=True)
class AIResult[T: BaseModel]:
    value: T
    model: str
    usage: dict[str, Any]
    request_id: str | None
    prompt_version: str
    trace_id: str | None = None


class StructuredAI(Protocol):
    async def reconcile_values(self, text: str, schema: type[T]) -> AIResult[T]: ...

    async def extract_document(
        self, text: str, schema: type[T], *, images: tuple[ImageInput, ...] = ()
    ) -> AIResult[T]: ...

    async def suggest_hs(
        self, description: str, candidates: list[dict[str, str]], schema: type[T]
    ) -> AIResult[T]: ...
