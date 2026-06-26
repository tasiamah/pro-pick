"""Live fixture sync for the API-Football free tier (date-based window)."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.models import Match, Odds, Prediction, ValueBet
from app.services.data_ingestion import FootballApiClient, FootballApiError
from app.services.historical_import import (
    UPCOMING_MATCH_STATUSES,
    HistoricalDataImporter,
    ImportSummary,
)
from app.services.prediction import predict_match
from app.services.value_bets import evaluate_match

logger = logging.getLogger(__name__)

PREDICTION_MODEL_VERSION = "stub-v1"


@dataclass
class LiveSyncSummary:
    fixtures_fetched: int = 0
    import_summary: ImportSummary | None = None
    predictions: int = 0
    value_bets: int = 0

    def merge_import(self, summary: ImportSummary) -> None:
        self.import_summary = summary


def fetch_fixtures_for_window(
    client: FootballApiClient,
    league_ids: tuple[int, ...],
    date_offsets: tuple[int, ...],
    now: datetime | None = None,
) -> list[dict]:
    resolved = now or datetime.now(UTC)
    today = resolved.date()
    league_set = set(league_ids)
    fixtures_by_id: dict[int, dict] = {}

    for offset in date_offsets:
        sync_date = today + timedelta(days=offset)
        try:
            fixtures = client.get_fixtures_by_date(sync_date)
        except FootballApiError:
            logger.exception("Provider error while fetching fixtures for %s", sync_date)
            continue

        for fixture_item in fixtures:
            league_id = fixture_item.get("league", {}).get("id")
            if league_id not in league_set:
                continue
            external_id = fixture_item.get("fixture", {}).get("id")
            if external_id is None:
                continue
            fixtures_by_id[int(external_id)] = fixture_item

    return list(fixtures_by_id.values())


def sync_predictions_for_upcoming(db: Session) -> int:
    now = datetime.utcnow()
    matches = db.scalars(
        select(Match)
        .options(selectinload(Match.predictions))
        .where(
            Match.status.in_(UPCOMING_MATCH_STATUSES),
            Match.kickoff >= now,
        )
    ).all()
    created = 0

    for match in matches:
        if match.predictions:
            continue

        probabilities = predict_match()
        db.add(
            Prediction(
                match_id=match.id,
                model_version=PREDICTION_MODEL_VERSION,
                prob_home=probabilities["home"],
                prob_draw=probabilities["draw"],
                prob_away=probabilities["away"],
            )
        )
        created += 1

    if created:
        db.commit()

    return created


def sync_value_bets_for_upcoming(db: Session) -> int:
    now = datetime.utcnow()
    matches = db.scalars(
        select(Match)
        .options(
            selectinload(Match.predictions),
            selectinload(Match.odds),
            selectinload(Match.value_bets),
        )
        .where(
            Match.status.in_(UPCOMING_MATCH_STATUSES),
            Match.kickoff >= now,
        )
    ).all()
    created = 0
    dirty = False

    for match in matches:
        if not match.predictions or not match.odds:
            continue

        latest_prediction = max(match.predictions, key=lambda item: item.created_at)
        primary_odds = _primary_odds(match.odds)
        if primary_odds is None:
            continue

        probabilities = {
            "home": latest_prediction.prob_home,
            "draw": latest_prediction.prob_draw,
            "away": latest_prediction.prob_away,
        }
        odds_values = {
            "home": primary_odds.home,
            "draw": primary_odds.draw,
            "away": primary_odds.away,
        }
        value_results = evaluate_match(probabilities, odds_values)

        db.execute(
            delete(ValueBet).where(
                ValueBet.match_id == match.id,
                ValueBet.settled.is_(False),
            )
        )
        dirty = True

        for result in value_results:
            db.add(
                ValueBet(
                    match_id=match.id,
                    outcome=result.outcome,
                    model_prob=result.model_prob,
                    odd=result.odd,
                    expected_value=result.expected_value,
                    edge=result.edge,
                    recommended_stake=result.recommended_stake,
                    confidence=result.confidence,
                )
            )
            created += 1

    if dirty:
        db.commit()

    return created


def _primary_odds(odds_rows: list[Odds]) -> Odds | None:
    if not odds_rows:
        return None
    return sorted(odds_rows, key=lambda item: (item.bookmaker.lower(), item.id))[0]


def run_live_sync(
    db: Session,
    *,
    league_ids: tuple[int, ...] | None = None,
    date_offsets: tuple[int, ...] | None = None,
    import_odds: bool | None = None,
    client: FootballApiClient | None = None,
    now: datetime | None = None,
) -> LiveSyncSummary:
    resolved_league_ids = league_ids or settings.sync_league_id_list
    resolved_offsets = date_offsets or settings.sync_date_offset_list
    resolved_import_odds = (
        settings.scheduler_import_odds if import_odds is None else import_odds
    )
    api_client = client or FootballApiClient()
    summary = LiveSyncSummary()

    fixtures = fetch_fixtures_for_window(
        api_client,
        resolved_league_ids,
        resolved_offsets,
        now=now,
    )
    summary.fixtures_fetched = len(fixtures)

    if not fixtures:
        logger.info("Live sync found no fixtures for leagues %s", resolved_league_ids)
        return summary

    importer = HistoricalDataImporter(
        db,
        client=api_client,
        import_odds=resolved_import_odds,
        upcoming_odds_only=True,
    )
    import_summary = importer.import_fixture_items(fixtures)
    summary.merge_import(import_summary)

    summary.predictions = sync_predictions_for_upcoming(db)
    summary.value_bets = sync_value_bets_for_upcoming(db)

    logger.info(
        "Live sync complete: %s fixtures, %s new matches, %s odds rows, "
        "%s predictions, %s value bets",
        summary.fixtures_fetched,
        import_summary.matches,
        import_summary.odds,
        summary.predictions,
        summary.value_bets,
    )

    return summary
