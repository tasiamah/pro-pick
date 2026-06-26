"""Integration tests for the auto-generated OpenAPI schema and docs."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app

pytestmark = pytest.mark.integration

EXPECTED_PATHS = (
    "/",
    "/health",
    "/dashboard",
    "/matches",
    "/matches/{match_id}",
    "/predictions",
    "/value-bets",
    "/analytics",
)

EXPECTED_SCHEMAS = (
    "HealthOut",
    "ServiceInfoOut",
    "MatchDetailOut",
    "PredictionOut",
    "OddsOut",
    "TeamOut",
    "ValueBetOut",
    "AnalyticsOut",
    "DashboardOut",
)


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def test_openapi_schema_lists_every_endpoint(client: TestClient) -> None:
    response = client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    for path in EXPECTED_PATHS:
        assert path in paths


def test_openapi_schema_includes_resource_models(client: TestClient) -> None:
    response = client.get("/openapi.json")

    assert response.status_code == 200
    schemas = response.json()["components"]["schemas"]
    for model in EXPECTED_SCHEMAS:
        assert model in schemas


def test_docs_endpoint_is_available(client: TestClient) -> None:
    response = client.get("/docs")

    assert response.status_code == 200
