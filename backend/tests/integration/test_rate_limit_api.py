from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

pytestmark = pytest.mark.integration


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def test_requests_exceeding_limit_return_429(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "rate_limit_requests", 3)

    statuses = [client.get("/health").status_code for _ in range(4)]

    assert statuses == [200, 200, 200, 429]

    response = client.get("/health")
    assert response.json() == {"detail": "Rate limit exceeded. Try again later."}
    assert "Retry-After" in response.headers


def test_rate_limiting_can_be_disabled(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "rate_limit_requests", 1)
    monkeypatch.setattr(settings, "rate_limit_enabled", False)

    statuses = [client.get("/health").status_code for _ in range(3)]

    assert statuses == [200, 200, 200]
