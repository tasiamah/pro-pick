"""Integration tests for push notification endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.database import SessionLocal
from app.main import app
from app.models import Match
from app.services.notification_keys import MATCH_NOTIFICATION_KEYS

pytestmark = pytest.mark.integration


@pytest.fixture(scope="module")
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def test_register_push_token(client: TestClient) -> None:
    response = client.post(
        "/notifications/register",
        json={
            "device_id": "test-device-001",
            "expo_push_token": "ExponentPushToken[test-token-001]",
            "platform": "ios",
        },
    )
    assert response.status_code == 200
    assert response.json()["registered"] is True


def test_save_and_fetch_preferences(client: TestClient) -> None:
    db = SessionLocal()
    try:
        match = db.scalar(select(Match))
    finally:
        db.close()

    if match is None:
        pytest.skip("No matches in database")

    settings = {key: key == "goal" for key in MATCH_NOTIFICATION_KEYS}
    save_response = client.put(
        "/notifications/preferences",
        json={
            "device_id": "test-device-001",
            "match_id": match.id,
            "settings": settings,
        },
    )
    assert save_response.status_code == 200
    assert save_response.json()["settings"]["goal"] is True

    fetch_response = client.get(
        "/notifications/preferences",
        params={"device_id": "test-device-001", "match_id": match.id},
    )
    assert fetch_response.status_code == 200
    assert fetch_response.json()["settings"]["goal"] is True
    assert fetch_response.json()["settings"]["match_start"] is False


def test_test_notification_requires_token(client: TestClient) -> None:
    db = SessionLocal()
    try:
        match = db.scalar(select(Match))
    finally:
        db.close()

    if match is None:
        pytest.skip("No matches in database")

    response = client.post(
        "/notifications/test",
        json={
            "device_id": "missing-device",
            "match_id": match.id,
            "event_type": "goal",
        },
    )
    assert response.status_code == 404
