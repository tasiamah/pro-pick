"""Integration tests: app + database working together.

These tests start the FastAPI app via the TestClient (which runs the lifespan and
`init_db()`) and talk to the configured database. In CI, `DATABASE_URL` points to
a real PostgreSQL service; locally it falls back to SQLite.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.database import engine
from app.main import app

pytestmark = pytest.mark.integration


@pytest.fixture(scope="module")
def client() -> TestClient:
    # The context manager triggers the lifespan, which creates the tables.
    with TestClient(app) as test_client:
        yield test_client


def test_health_endpoint_returns_ok(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_root_endpoint_advertises_docs(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["health"] == "/health"


def test_database_is_reachable() -> None:
    with engine.connect() as connection:
        assert connection.execute(text("SELECT 1")).scalar() == 1
