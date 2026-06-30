"""Register and refresh Expo push tokens for devices."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import DevicePushToken


def register_push_token(
    db: Session,
    *,
    device_id: str,
    expo_push_token: str,
    platform: str,
) -> DevicePushToken:
    now = datetime.now(UTC).replace(tzinfo=None)
    existing = db.scalar(
        select(DevicePushToken).where(
            DevicePushToken.expo_push_token == expo_push_token
        )
    )

    if existing is not None:
        existing.device_id = device_id
        existing.platform = platform
        existing.last_seen_at = now
        db.commit()
        db.refresh(existing)
        return existing

    token_row = DevicePushToken(
        device_id=device_id,
        expo_push_token=expo_push_token,
        platform=platform,
        last_seen_at=now,
    )
    db.add(token_row)
    db.commit()
    db.refresh(token_row)
    return token_row


def get_push_tokens_for_devices(
    db: Session,
    device_ids: list[str],
) -> dict[str, str]:
    if not device_ids:
        return {}

    rows = db.scalars(
        select(DevicePushToken).where(DevicePushToken.device_id.in_(device_ids))
    ).all()

    tokens: dict[str, str] = {}
    for row in rows:
        tokens[row.device_id] = row.expo_push_token
    return tokens
