from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SentNotification(Base):
    __tablename__ = "sent_notifications"
    __table_args__ = (
        UniqueConstraint(
            "device_id",
            "match_id",
            "event_type",
            "event_fingerprint",
            name="uq_sent_notification",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[str] = mapped_column(String(64), index=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(32))
    event_fingerprint: Mapped[str] = mapped_column(String(128))
    sent_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )
