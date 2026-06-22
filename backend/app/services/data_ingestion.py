from __future__ import annotations

import httpx

from app.core.config import settings

"""Data pipeline: fetches matches + odds from the external provider.

Stub for EPIC-2 / Day 2. The HTTP client is ready; mapping to the database
models follows in the data-pipeline tickets.
"""


class FootballApiClient:
    def __init__(self, base_url: str | None = None, api_key: str | None = None) -> None:
        self.base_url = base_url or settings.football_api_base_url
        self.api_key = api_key or settings.football_api_key

    def _headers(self) -> dict:
        # API-Football expects the key in this header.
        return {"x-apisports-key": self.api_key}

    def get_fixtures(self, league: int, season: int) -> list[dict]:
        """Fetch upcoming matches for a league/season."""
        params = {"league": league, "season": season}
        with httpx.Client(timeout=20.0) as client:
            resp = client.get(
                f"{self.base_url}/fixtures",
                headers=self._headers(),
                params=params,
            )
            resp.raise_for_status()
            return resp.json().get("response", [])

    def get_odds(self, fixture_id: int) -> list[dict]:
        """Fetch odds for a specific match."""
        params = {"fixture": fixture_id}
        with httpx.Client(timeout=20.0) as client:
            resp = client.get(
                f"{self.base_url}/odds",
                headers=self._headers(),
                params=params,
            )
            resp.raise_for_status()
            return resp.json().get("response", [])
