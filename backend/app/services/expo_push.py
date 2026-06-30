"""Send push notifications via the Expo Push API."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


@dataclass(frozen=True)
class PushMessage:
    to: str
    title: str
    body: str
    data: dict[str, str]
    sound: str = "default"


@dataclass(frozen=True)
class PushSendResult:
    sent: int
    failed: int
    errors: list[str]


def send_push_messages(messages: list[PushMessage]) -> PushSendResult:
    if not settings.notifications_enabled:
        logger.info("Notifications disabled; skipping %s push messages", len(messages))
        return PushSendResult(sent=0, failed=len(messages), errors=["disabled"])

    if not messages:
        return PushSendResult(sent=0, failed=0, errors=[])

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if settings.expo_access_token.strip():
        headers["Authorization"] = f"Bearer {settings.expo_access_token.strip()}"

    payload = [
        {
            "to": message.to,
            "title": message.title,
            "body": message.body,
            "data": message.data,
            "sound": message.sound,
            "priority": "high",
        }
        for message in messages
    ]

    try:
        with httpx.Client(timeout=20.0) as client:
            response = client.post(EXPO_PUSH_URL, headers=headers, json=payload)
            response.raise_for_status()
            body = response.json()
    except httpx.HTTPError as exc:
        logger.exception("Expo push request failed")
        return PushSendResult(
            sent=0,
            failed=len(messages),
            errors=[str(exc)],
        )

    data = body.get("data", [])
    sent = 0
    failed = 0
    errors: list[str] = []

    if not isinstance(data, list):
        return PushSendResult(sent=0, failed=len(messages), errors=["invalid response"])

    for ticket in data:
        status = ticket.get("status")
        if status == "ok":
            sent += 1
            continue
        failed += 1
        detail = ticket.get("message") or ticket.get("details") or "unknown error"
        errors.append(str(detail))

    return PushSendResult(sent=sent, failed=failed, errors=errors)
