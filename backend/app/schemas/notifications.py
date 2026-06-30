from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.services.notification_keys import MATCH_NOTIFICATION_KEYS


class PushTokenRegisterIn(BaseModel):
    device_id: str = Field(min_length=8, max_length=64)
    expo_push_token: str = Field(min_length=10, max_length=255)
    platform: str = Field(min_length=2, max_length=16)


class PushTokenRegisterOut(BaseModel):
    device_id: str
    registered: bool


class MatchNotificationSettingsIn(BaseModel):
    device_id: str = Field(min_length=8, max_length=64)
    match_id: int = Field(gt=0)
    settings: dict[str, bool]


class MatchNotificationSettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    match_id: int
    settings: dict[str, bool]


class TestNotificationIn(BaseModel):
    device_id: str = Field(min_length=8, max_length=64)
    match_id: int = Field(gt=0)
    event_type: str
    secret: str | None = None


class TestNotificationOut(BaseModel):
    sent: bool
    recipients: int
    message: str


def validate_notification_settings(settings: dict[str, bool]) -> dict[str, bool]:
    unknown = set(settings) - MATCH_NOTIFICATION_KEYS
    if unknown:
        unknown_list = ", ".join(sorted(unknown))
        raise ValueError(f"Unknown notification keys: {unknown_list}")

    return {key: bool(settings.get(key, False)) for key in MATCH_NOTIFICATION_KEYS}
