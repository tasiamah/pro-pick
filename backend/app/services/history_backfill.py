"""Backfill match history for teams (countries) that have too little of it.

Results-derived features (form, goals, rest days, Elo, head-to-head) are built
from finished matches already in our DB. Teams with only a handful of stored
matches — national sides in tournaments especially — get near-default features,
which flattens their predictions toward a coin flip. This service finds the
teams in the upcoming slate that lack history and pulls their recent finished
fixtures so the model has real signal to work with.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Match, Team
from app.services.data_ingestion import FootballApiClient
from app.services.historical_import import (
    FINISHED_MATCH_STATUS,
    UPCOMING_MATCH_STATUSES,
    HistoricalDataImporter,
    ImportSummary,
)

logger = logging.getLogger(__name__)


def _naive_utc_now(now: datetime | None) -> datetime:
    resolved = now or datetime.now(UTC)
    if resolved.tzinfo is not None:
        return resolved.astimezone(UTC).replace(tzinfo=None)
    return resolved


def _finished_match_counts(db: Session, team_ids: set[int]) -> dict[int, int]:
    """Count finished matches (home or away) per team in ``team_ids``."""
    counts: dict[int, int] = {team_id: 0 for team_id in team_ids}
    if not team_ids:
        return counts

    rows = db.execute(
        select(Match.home_team_id, Match.away_team_id).where(
            Match.status == FINISHED_MATCH_STATUS,
            Match.home_goals.is_not(None),
            Match.away_goals.is_not(None),
            or_(
                Match.home_team_id.in_(team_ids),
                Match.away_team_id.in_(team_ids),
            ),
        )
    ).all()

    for home_team_id, away_team_id in rows:
        if home_team_id in counts:
            counts[home_team_id] += 1
        if away_team_id in counts:
            counts[away_team_id] += 1
    return counts


def teams_needing_history(
    db: Session,
    *,
    now: datetime | None = None,
    min_finished_matches: int,
    max_teams: int,
) -> list[Team]:
    """Teams in the upcoming slate with fewer than ``min_finished_matches`` of
    stored finished history, soonest kickoff first, capped at ``max_teams``.
    """
    cutoff = _naive_utc_now(now)
    upcoming = db.scalars(
        select(Match)
        .where(
            Match.status.in_(UPCOMING_MATCH_STATUSES),
            Match.kickoff.is_not(None),
            Match.kickoff >= cutoff,
        )
        .order_by(Match.kickoff.asc())
    ).all()

    # Preserve soonest-first ordering while de-duplicating team ids.
    ordered_team_ids: list[int] = []
    seen: set[int] = set()
    for match in upcoming:
        for team_id in (match.home_team_id, match.away_team_id):
            if team_id is not None and team_id not in seen:
                seen.add(team_id)
                ordered_team_ids.append(team_id)

    if not ordered_team_ids:
        return []

    counts = _finished_match_counts(db, seen)
    needy_ids = [
        team_id
        for team_id in ordered_team_ids
        if counts.get(team_id, 0) < min_finished_matches
    ][:max_teams]
    if not needy_ids:
        return []

    teams = db.scalars(select(Team).where(Team.id.in_(needy_ids))).all()
    teams_by_id = {team.id: team for team in teams}
    return [teams_by_id[team_id] for team_id in needy_ids if team_id in teams_by_id]


def backfill_missing_team_history(
    db: Session,
    *,
    client: FootballApiClient | None = None,
    now: datetime | None = None,
    min_finished_matches: int | None = None,
    last: int | None = None,
    max_teams: int | None = None,
) -> ImportSummary:
    """Fetch recent finished fixtures for upcoming-slate teams missing history.

    Only teams below the history threshold are fetched (one API call each,
    results only), capped per run to bound quota. Safe to call every sync: once a
    team has enough stored matches it is skipped.
    """
    resolved_min = (
        settings.history_backfill_min_matches
        if min_finished_matches is None
        else min_finished_matches
    )
    resolved_last = settings.history_backfill_last_fixtures if last is None else last
    resolved_max_teams = (
        settings.history_backfill_max_teams if max_teams is None else max_teams
    )

    teams = teams_needing_history(
        db,
        now=now,
        min_finished_matches=resolved_min,
        max_teams=resolved_max_teams,
    )
    external_ids = [team.external_id for team in teams if team.external_id is not None]
    if not external_ids:
        return ImportSummary()

    logger.info(
        "Backfilling history for %s team(s) missing it (min=%s, last=%s)",
        len(external_ids),
        resolved_min,
        resolved_last,
    )

    # Results only: never fetch odds for the (finished) history matches.
    importer = HistoricalDataImporter(
        db,
        client=client or FootballApiClient(),
        import_odds=False,
    )
    summary = importer.backfill_team_history(external_ids, last=resolved_last)
    logger.info(
        "Team-history backfill complete: %s matches, %s teams, %s competitions",
        summary.matches,
        summary.teams,
        summary.competitions,
    )
    return summary
