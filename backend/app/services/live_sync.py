"""Live fixture sync for the API-Football free tier (date-based window)."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.models import Match, ValueBet
from app.services.analytics import actual_outcome
from app.services.data_ingestion import FootballApiClient, FootballApiError
from app.services.historical_import import (
    FINISHED_MATCH_STATUS,
    UPCOMING_MATCH_STATUSES,
    HistoricalDataImporter,
    ImportSummary,
)
from app.services.ingestion_alerts import IngestionPipelineError
from app.services.match_notification_events import (
    NotificationDispatchSummary,
    process_match_fixture_update,
    run_live_notification_sync,
)
from app.services.prediction import refresh_predictions_for_upcoming
from app.services.value_bets import generate_value_bets, settlement_profit

logger = logging.getLogger(__name__)


@dataclass
class FetchWindowResult:
    fixtures: list[dict]
    dates_attempted: int = 0
    dates_failed: int = 0

    @property
    def all_dates_failed(self) -> bool:
        return self.dates_attempted > 0 and self.dates_failed == self.dates_attempted


@dataclass
class LiveSyncSummary:
    fixtures_fetched: int = 0
    import_summary: ImportSummary | None = None
    predictions: int = 0
    value_bets: int = 0
    settled_value_bets: int = 0
    notifications: NotificationDispatchSummary | None = None

    def merge_import(self, summary: ImportSummary) -> None:
        self.import_summary = summary


def _resolve_sync_now(now: datetime | None) -> datetime:
    resolved = now or datetime.now(UTC)
    if resolved.tzinfo is not None:
        return resolved.astimezone(UTC).replace(tzinfo=None)
    return resolved


def fetch_fixtures_for_window(
    client: FootballApiClient,
    league_ids: tuple[int, ...],
    date_offsets: tuple[int, ...],
    now: datetime | None = None,
) -> FetchWindowResult:
    resolved = now or datetime.now(UTC)
    today = resolved.date()
    league_set = set(league_ids)
    fixtures_by_id: dict[int, dict] = {}
    dates_attempted = 0
    dates_failed = 0

    for offset in date_offsets:
        sync_date = today + timedelta(days=offset)
        dates_attempted += 1
        try:
            fixtures = client.get_fixtures_by_date(sync_date)
        except (FootballApiError, httpx.HTTPError):
            dates_failed += 1
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

    return FetchWindowResult(
        fixtures=list(fixtures_by_id.values()),
        dates_attempted=dates_attempted,
        dates_failed=dates_failed,
    )


def sync_value_bets_for_upcoming(
    db: Session,
    *,
    now: datetime | None = None,
) -> int:
    cutoff = _resolve_sync_now(now)
    matches = db.scalars(
        select(Match)
        .options(
            selectinload(Match.predictions),
            selectinload(Match.odds),
            selectinload(Match.value_bets),
        )
        .where(
            Match.status.in_(UPCOMING_MATCH_STATUSES),
            Match.kickoff >= cutoff,
        )
    ).all()
    created = 0
    dirty = False

    for match in matches:
        if not match.predictions or not match.odds:
            continue

        created += len(generate_value_bets(db, match))
        dirty = True

    if dirty:
        db.commit()

    return created


def settle_value_bets(db: Session) -> int:
    """Settle open value bets on finished matches, recording realized profit.

    Compares each unsettled bet to the final result, computes profit with the
    stake actually used for ROI (fractional Kelly, falling back to one unit), and
    marks it settled so analytics can track ROI over time.
    """
    open_bets = db.execute(
        select(ValueBet, Match)
        .join(Match, ValueBet.match_id == Match.id)
        .where(
            ValueBet.settled.is_(False),
            Match.status == FINISHED_MATCH_STATUS,
            Match.home_goals.is_not(None),
            Match.away_goals.is_not(None),
        )
    ).all()

    for value_bet, match in open_bets:
        stake = value_bet.recommended_stake if value_bet.recommended_stake > 0 else 1.0
        won = value_bet.outcome == actual_outcome(match.home_goals, match.away_goals)
        value_bet.profit = round(settlement_profit(won, value_bet.odd, stake), 4)
        value_bet.settled = True

    if open_bets:
        db.commit()

    return len(open_bets)


def _process_fixture_notifications(
    db: Session,
    fixtures: list[dict],
) -> NotificationDispatchSummary:
    total = NotificationDispatchSummary()
    external_ids = [
        int(item["fixture"]["id"])
        for item in fixtures
        if item.get("fixture", {}).get("id") is not None
    ]
    if not external_ids:
        return total

    matches = db.scalars(
        select(Match)
        .options(
            selectinload(Match.home_team),
            selectinload(Match.away_team),
        )
        .where(Match.external_id.in_(external_ids))
    ).all()
    matches_by_external = {
        match.external_id: match for match in matches if match.external_id is not None
    }

    for fixture_item in fixtures:
        external_id = fixture_item.get("fixture", {}).get("id")
        if external_id is None:
            continue
        match = matches_by_external.get(int(external_id))
        if match is None:
            continue

        result = process_match_fixture_update(db, match, fixture_item)
        total.events_detected += result.events_detected
        total.messages_sent += result.messages_sent
        total.messages_failed += result.messages_failed

    return total


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
    resolved_now = _resolve_sync_now(now)

    fetch_result = fetch_fixtures_for_window(
        api_client,
        resolved_league_ids,
        resolved_offsets,
        now=resolved_now,
    )
    if fetch_result.all_dates_failed:
        raise IngestionPipelineError(
            f"All {fetch_result.dates_attempted} fixture date fetches failed"
        )

    fixtures = fetch_result.fixtures
    summary.fixtures_fetched = len(fixtures)

    if fixtures:
        importer = HistoricalDataImporter(
            db,
            client=api_client,
            import_odds=resolved_import_odds,
            upcoming_odds_only=True,
        )
        summary.merge_import(importer.import_fixture_items(fixtures))
        summary.predictions = refresh_predictions_for_upcoming(db, now=resolved_now)
        summary.value_bets = sync_value_bets_for_upcoming(db, now=resolved_now)
    else:
        logger.info("Live sync found no fixtures for leagues %s", resolved_league_ids)

    summary.settled_value_bets = settle_value_bets(db)

    if settings.notifications_enabled:
        notification_summary = NotificationDispatchSummary()
        if fixtures:
            fixture_summary = _process_fixture_notifications(db, fixtures)
            notification_summary.events_detected += fixture_summary.events_detected
            notification_summary.messages_sent += fixture_summary.messages_sent
            notification_summary.messages_failed += fixture_summary.messages_failed
        live_summary = run_live_notification_sync(db, api_client)
        notification_summary.events_detected += live_summary.events_detected
        notification_summary.messages_sent += live_summary.messages_sent
        notification_summary.messages_failed += live_summary.messages_failed
        summary.notifications = notification_summary

    logger.info(
        "Live sync complete: %s fixtures, %s new matches, %s odds rows, "
        "%s predictions, %s value bets, %s settled bets, %s push sent",
        summary.fixtures_fetched,
        summary.import_summary.matches if summary.import_summary else 0,
        summary.import_summary.odds if summary.import_summary else 0,
        summary.predictions,
        summary.value_bets,
        summary.settled_value_bets,
        summary.notifications.messages_sent if summary.notifications else 0,
    )

    return summary
