from typing import Any
from uuid import UUID

from sqlalchemy import JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from ecus_api.db.base import Base


class CaseReview(Base):
    """Versioned review aggregate; the revision protects all input mutations."""

    __tablename__ = "case_reviews"
    case_id: Mapped[UUID] = mapped_column(ForeignKey("shipment_cases.id"), primary_key=True)
    revision: Mapped[int] = mapped_column(default=0)
    data: Mapped[dict[str, Any]] = mapped_column(JSON)
