"""Persist and load per-device match notification preferences."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import MatchNotificationPreference
from app.schemas.notifications import validate_notification_settings
from app.services.notification_keys import MATCH_NOTIFICATION_KEYS


def default_settings() -> dict[str, bool]:
    return dict.fromkeys(MATCH_NOTIFICATION_KEYS, False)


def get_match_notification_settings(
    db: Session,
    *,
    device_id: str,
    match_id: int,
) -> dict[str, bool]:
    rows = db.scalars(
        select(MatchNotificationPreference).where(
            MatchNotificationPreference.device_id == device_id,
            MatchNotificationPreference.match_id == match_id,
        )
    ).all()

    settings = default_settings()
    for row in rows:
        if row.notification_key in settings:
            settings[row.notification_key] = row.enabled
    return settings


def save_match_notification_settings(
    db: Session,
    *,
    device_id: str,
    match_id: int,
    settings: dict[str, bool],
) -> dict[str, bool]:
    normalized = validate_notification_settings(settings)
    existing_rows = db.scalars(
        select(MatchNotificationPreference).where(
            MatchNotificationPreference.device_id == device_id,
            MatchNotificationPreference.match_id == match_id,
        )
    ).all()
    existing_by_key = {row.notification_key: row for row in existing_rows}

    for key, enabled in normalized.items():
        row = existing_by_key.get(key)
        if row is not None:
            row.enabled = enabled
            continue
        db.add(
            MatchNotificationPreference(
                device_id=device_id,
                match_id=match_id,
                notification_key=key,
                enabled=enabled,
            )
        )

    db.commit()
    return normalized


def get_enabled_devices_for_event(
    db: Session,
    *,
    match_id: int,
    event_type: str,
) -> list[str]:
    rows = db.scalars(
        select(MatchNotificationPreference.device_id).where(
            MatchNotificationPreference.match_id == match_id,
            MatchNotificationPreference.notification_key == event_type,
            MatchNotificationPreference.enabled.is_(True),
        )
    ).all()
    return list(dict.fromkeys(rows))
