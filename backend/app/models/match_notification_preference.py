from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MatchNotificationPreference(Base):
    __tablename__ = "match_notification_preferences"
    __table_args__ = (
        UniqueConstraint(
            "device_id",
            "match_id",
            "notification_key",
            name="uq_match_notification_preference",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[str] = mapped_column(String(64), index=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    notification_key: Mapped[str] = mapped_column(String(32))
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
