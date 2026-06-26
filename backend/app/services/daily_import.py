"""Daily import of fixtures and odds for the current season."""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.services.data_ingestion import FootballApiClient, FootballApiError
from app.services.historical_import import (
    DEFAULT_LEAGUE_IDS,
    HistoricalDataImporter,
    ImportSummary,
)

logger = logging.getLogger(__name__)


def current_season_year(now: datetime | None = None) -> int:
    resolved = now or datetime.now(UTC)
    return resolved.year if resolved.month >= 7 else resolved.year - 1


def run_daily_import(
    db: Session,
    *,
    league_ids: tuple[int, ...] = DEFAULT_LEAGUE_IDS,
    season: int | None = None,
    import_odds: bool = True,
    client: FootballApiClient | None = None,
) -> ImportSummary:
    resolved_season = season if season is not None else current_season_year()
    importer = HistoricalDataImporter(db, client=client, import_odds=import_odds)
    total = ImportSummary()

    for league_id in league_ids:
        try:
            result = importer.import_league_season(league_id, resolved_season)
            total.merge(result)
            logger.info(
                "Daily import league %s season %s: %s new matches, %s odds rows",
                league_id,
                resolved_season,
                result.matches,
                result.odds,
            )
        except FootballApiError:
            db.rollback()
            logger.exception(
                "Provider error during daily import for league %s season %s",
                league_id,
                resolved_season,
            )
        except Exception:
            db.rollback()
            logger.exception(
                "Unexpected error during daily import for league %s season %s",
                league_id,
                resolved_season,
            )

    return total
