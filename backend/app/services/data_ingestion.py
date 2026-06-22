from __future__ import annotations

import httpx

from app.core.config import settings

"""Datapijplijn: haalt wedstrijden + odds op bij de externe provider.

Stub voor EPIC-2 / Dag 2. De HTTP-client staat klaar; de mapping naar de
database-modellen volgt in de datapijplijn-tickets.
"""


class FootballApiClient:
    def __init__(self, base_url: str | None = None, api_key: str | None = None) -> None:
        self.base_url = base_url or settings.football_api_base_url
        self.api_key = api_key or settings.football_api_key

    def _headers(self) -> dict:
        # API-Football verwacht de key in deze header.
        return {"x-apisports-key": self.api_key}

    def get_fixtures(self, league: int, season: int) -> list[dict]:
        """Haal komende wedstrijden op voor een competitie/seizoen."""
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
        """Haal odds op voor een specifieke wedstrijd."""
        params = {"fixture": fixture_id}
        with httpx.Client(timeout=20.0) as client:
            resp = client.get(
                f"{self.base_url}/odds",
                headers=self._headers(),
                params=params,
            )
            resp.raise_for_status()
            return resp.json().get("response", [])
