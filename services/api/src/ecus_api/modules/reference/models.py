from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from ecus_api.db.base import Base


class DeclarationProfile(Base):
    __tablename__ = "declaration_profiles"

    code: Mapped[str] = mapped_column(String(20), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    enabled: Mapped[bool] = mapped_column(default=True)
