from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from ecus_api.db.base import Base, UTCDateTime, utcnow


class ShipmentCase(Base):
    __tablename__ = "shipment_cases"
    __table_args__ = (CheckConstraint("status = 'draft'", name="status"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    reference: Mapped[str] = mapped_column(String(40), unique=True)
    title: Mapped[str] = mapped_column(String(200))
    procedure: Mapped[str] = mapped_column(ForeignKey("declaration_profiles.code"))
    status: Mapped[str] = mapped_column(String(32), default="draft")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)
