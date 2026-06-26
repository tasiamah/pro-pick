"""HTTP client for API-Football fixtures and odds."""

from __future__ import annotations

import time
from typing import Any

import httpx

from app.core.config import settings


class FootballApiError(Exception):
    """Raised when the football data provider returns an error payload."""


class FootballApiClient:
    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout_seconds: float | None = None,
        max_retries: int | None = None,
        min_request_interval_seconds: float | None = None,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.base_url = (base_url or settings.football_api_base_url).rstrip("/")
        self.api_key = api_key if api_key is not None else settings.football_api_key
        self.timeout_seconds = (
            timeout_seconds
            if timeout_seconds is not None
            else settings.football_api_timeout_seconds
        )
        self.max_retries = max_retries
        if self.max_retries is None:
            self.max_retries = settings.football_api_max_retries
        self.min_request_interval_seconds = (
            min_request_interval_seconds
            if min_request_interval_seconds is not None
            else settings.football_api_min_request_interval_seconds
        )
        if self.timeout_seconds <= 0:
            raise ValueError("timeout_seconds must be > 0")
        if self.max_retries < 0:
            raise ValueError("max_retries must be >= 0")
        if self.min_request_interval_seconds < 0:
            raise ValueError("min_request_interval_seconds must be >= 0")
        self._transport = transport
        self._last_request_at = 0.0

    def _headers(self) -> dict[str, str]:
        return {"x-apisports-key": self.api_key}

    def _wait_for_rate_limit(self) -> None:
        if self.min_request_interval_seconds <= 0:
            return

        elapsed = time.monotonic() - self._last_request_at
        remaining = self.min_request_interval_seconds - elapsed
        if remaining > 0:
            time.sleep(remaining)

    def _request(self, path: str, params: dict[str, Any]) -> dict[str, Any]:
        url = f"{self.base_url}/{path.lstrip('/')}"
        last_error: Exception | None = None

        for attempt in range(self.max_retries + 1):
            self._wait_for_rate_limit()
            try:
                with httpx.Client(
                    timeout=self.timeout_seconds,
                    transport=self._transport,
                ) as client:
                    response = client.get(
                        url,
                        headers=self._headers(),
                        params=params,
                    )
                self._last_request_at = time.monotonic()
            except httpx.TransportError as exc:
                last_error = exc
                if attempt == self.max_retries:
                    raise
                time.sleep(2**attempt)
                continue

            if response.status_code in {429, 500, 502, 503, 504}:
                last_error = httpx.HTTPStatusError(
                    "Provider request failed",
                    request=response.request,
                    response=response,
                )
                if attempt == self.max_retries:
                    response.raise_for_status()
                time.sleep(2**attempt)
                continue

            return self._parse_response(response)

        if last_error is not None:
            raise last_error

        raise FootballApiError("Football API request failed")

    def _parse_response(self, response: httpx.Response) -> dict[str, Any]:
        try:
            payload = response.json()
        except ValueError as exc:
            raise FootballApiError("Invalid JSON response from football API") from exc

        if not isinstance(payload, dict):
            raise FootballApiError("Unexpected football API response shape")

        errors = payload.get("errors")
        if errors:
            raise FootballApiError(str(errors))

        response.raise_for_status()
        return payload

    def get_fixtures(self, league: int, season: int) -> list[dict[str, Any]]:
        payload = self._request(
            "fixtures",
            {"league": league, "season": season},
        )
        response = payload.get("response", [])
        if not isinstance(response, list):
            raise FootballApiError("Unexpected fixtures response shape")
        return response

    def get_odds(self, fixture_id: int) -> list[dict[str, Any]]:
        payload = self._request(
            "odds",
            {"fixture": fixture_id},
        )
        response = payload.get("response", [])
        if not isinstance(response, list):
            raise FootballApiError("Unexpected odds response shape")
        return response
