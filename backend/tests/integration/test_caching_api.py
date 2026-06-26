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


@pytest.mark.parametrize("path", ["/analytics", "/dashboard"])
def test_heavy_endpoints_set_cache_control_header(
    client: TestClient, path: str
) -> None:
    response = client.get(path)

    assert response.status_code == 200
    assert (
        response.headers["Cache-Control"]
        == f"public, max-age={settings.cache_ttl_seconds}"
    )
