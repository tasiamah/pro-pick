from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.errors import register_exception_handlers

pytestmark = pytest.mark.unit


@pytest.fixture
def client() -> TestClient:
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/boom")
    def boom() -> None:
        raise RuntimeError("unexpected failure")

    return TestClient(app, raise_server_exceptions=False)


def test_unexpected_error_returns_consistent_detail(client: TestClient) -> None:
    response = client.get("/boom")

    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error"}
