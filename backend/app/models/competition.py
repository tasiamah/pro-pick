from __future__ import annotations

from typing import Optional

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Competition(Base):
    __tablename__ = "competitions"

    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[Optional[int]] = mapped_column(
        Integer, unique=True, index=True
    )
    name: Mapped[str] = mapped_column(String(120), index=True)
    country: Mapped[Optional[str]] = mapped_column(String(80))
    season: Mapped[Optional[str]] = mapped_column(String(20))

    teams: Mapped[list["Team"]] = relationship(back_populates="competition")
    matches: Mapped[list["Match"]] = relationship(back_populates="competition")
