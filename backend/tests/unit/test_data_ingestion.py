from __future__ import annotations

import httpx
import pytest

from app.services.data_ingestion import FootballApiClient, FootballApiError

pytestmark = pytest.mark.unit


def test_get_fixtures_returns_provider_response() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/fixtures"
        assert request.url.params["league"] == "39"
        assert request.url.params["season"] == "2024"
        assert request.headers["x-apisports-key"] == "test-key"
        return httpx.Response(
            200,
            json={"response": [{"fixture": {"id": 1001}}], "errors": []},
        )

    client = FootballApiClient(
        api_key="test-key",
        min_request_interval_seconds=0,
        transport=httpx.MockTransport(handler),
    )

    fixtures = client.get_fixtures(league=39, season=2024)

    assert fixtures == [{"fixture": {"id": 1001}}]


def test_get_team_fixtures_passes_team_and_last() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/fixtures"
        assert request.url.params["team"] == "33"
        assert request.url.params["last"] == "40"
        assert "season" not in request.url.params
        return httpx.Response(
            200,
            json={"response": [{"fixture": {"id": 7}}], "errors": []},
        )

    client = FootballApiClient(
        api_key="test-key",
        min_request_interval_seconds=0,
        transport=httpx.MockTransport(handler),
    )

    fixtures = client.get_team_fixtures(33, last=40)

    assert fixtures == [{"fixture": {"id": 7}}]


def test_get_team_fixtures_passes_season_when_given() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["team"] == "33"
        assert request.url.params["season"] == "2024"
        assert "last" not in request.url.params
        return httpx.Response(200, json={"response": [], "errors": []})

    client = FootballApiClient(
        api_key="test-key",
        min_request_interval_seconds=0,
        transport=httpx.MockTransport(handler),
    )

    assert client.get_team_fixtures(33, season=2024) == []


def test_get_odds_returns_provider_response() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/odds"
        assert request.url.params["fixture"] == "1001"
        return httpx.Response(
            200,
            json={"response": [{"bookmakers": []}], "errors": []},
        )

    client = FootballApiClient(
        api_key="test-key",
        min_request_interval_seconds=0,
        transport=httpx.MockTransport(handler),
    )

    odds = client.get_odds(fixture_id=1001)

    assert odds == [{"bookmakers": []}]


def test_get_fixtures_raises_on_provider_error_payload() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"response": [], "errors": {"token": "Invalid API key"}},
        )

    client = FootballApiClient(
        api_key="bad-key",
        min_request_interval_seconds=0,
        transport=httpx.MockTransport(handler),
    )

    with pytest.raises(FootballApiError, match="Invalid API key"):
        client.get_fixtures(league=39, season=2024)


def test_get_fixtures_retries_on_rate_limit() -> None:
    attempts = {"count": 0}

    def handler(_request: httpx.Request) -> httpx.Response:
        attempts["count"] += 1
        if attempts["count"] == 1:
            return httpx.Response(429, json={"message": "Too many requests"})
        return httpx.Response(
            200,
            json={"response": [{"fixture": {"id": 1001}}], "errors": []},
        )

    client = FootballApiClient(
        api_key="test-key",
        max_retries=2,
        min_request_interval_seconds=0,
        transport=httpx.MockTransport(handler),
    )

    fixtures = client.get_fixtures(league=39, season=2024)

    assert fixtures == [{"fixture": {"id": 1001}}]
    assert attempts["count"] == 2


def test_client_rejects_invalid_timeout() -> None:
    with pytest.raises(ValueError, match="timeout_seconds must be > 0"):
        FootballApiClient(timeout_seconds=0)


def test_get_fixtures_raises_football_api_error_on_unauthorized() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            401,
            json={"response": [], "errors": {"token": "Invalid API key"}},
        )

    client = FootballApiClient(
        api_key="bad-key",
        min_request_interval_seconds=0,
        transport=httpx.MockTransport(handler),
    )

    with pytest.raises(FootballApiError, match="Invalid API key"):
        client.get_fixtures(league=39, season=2024)
