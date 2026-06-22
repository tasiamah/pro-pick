from __future__ import annotations

from typing import Optional

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[Optional[int]] = mapped_column(
        Integer, unique=True, index=True
    )
    name: Mapped[str] = mapped_column(String(120), index=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String(255))

    competition_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("competitions.id"), nullable=True
    )
    competition: Mapped[Optional["Competition"]] = relationship(
        back_populates="teams"
    )
