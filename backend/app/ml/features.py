"""Feature engineering for the 1X2 prediction model (EPIC-3 / PP-53).

Builds reproducible, point-in-time features for a match from finished matches
that kicked off strictly before it: recent form, home/away form, goals
for/against, head-to-head, league standing (ranglijst), and rest days
(rustdagen). Injuries (blessures) are intentionally omitted until an injuries
data source is integrated; they cannot be derived from the current schema.

The pure ``compute_features`` works on lightweight snapshots so it is fully
deterministic and testable without a database. ``build_features`` and
``build_training_dataset`` load those snapshots from the database.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import Match

FORM_WINDOW = 5
WIN_POINTS = 3
DRAW_POINTS = 1
LOSS_POINTS = 0
DEFAULT_REST_DAYS = 7.0

# Elo strength rating: cheap, point-in-time team-strength signal replayed from
# match results. It captures longer-horizon quality than the 5-game form window
# and is the single strongest feature available from results-only data.
ELO_INITIAL = 1500.0
ELO_K = 20.0
ELO_HOME_ADVANTAGE = 65.0

OUTCOME_HOME = "home"
OUTCOME_DRAW = "draw"
OUTCOME_AWAY = "away"

FEATURE_COLUMNS: list[str] = [
    "home_form_points",
    "away_form_points",
    "home_home_form_points",
    "away_away_form_points",
    "home_goals_for_avg",
    "home_goals_against_avg",
    "away_goals_for_avg",
    "away_goals_against_avg",
    "h2h_home_win_rate",
    "h2h_draw_rate",
    "h2h_away_win_rate",
    "h2h_avg_goal_diff",
    "home_table_points",
    "away_table_points",
    "table_points_diff",
    "home_rest_days",
    "away_rest_days",
    "home_elo",
    "away_elo",
    "elo_diff",
]


@dataclass(frozen=True)
class MatchContext:
    """The match to build features for; its result is unknown."""

    competition_id: int | None
    season: str | None
    home_team_id: int
    away_team_id: int
    kickoff: datetime


@dataclass(frozen=True)
class MatchRecord:
    """A finished match used as history for point-in-time features."""

    match_id: int
    competition_id: int | None
    season: str | None
    home_team_id: int
    away_team_id: int
    kickoff: datetime
    home_goals: int
    away_goals: int


@dataclass(frozen=True)
class TrainingDataset:
    match_ids: list[int]
    features: list[dict[str, float]]
    labels: list[str]


@dataclass(frozen=True)
class _Form:
    points_avg: float
    goals_for_avg: float
    goals_against_avg: float


@dataclass(frozen=True)
class _HeadToHead:
    home_win_rate: float
    draw_rate: float
    away_win_rate: float
    avg_goal_diff: float


def compute_features(
    target: MatchContext,
    history: Sequence[MatchRecord],
    *,
    form_window: int = FORM_WINDOW,
) -> dict[str, float]:
    """Reproducible features for ``target`` from matches before its kickoff."""
    if form_window < 1:
        raise ValueError("form_window must be a positive integer")

    past = sorted(
        (record for record in history if record.kickoff < target.kickoff),
        key=lambda record: (record.kickoff, record.match_id),
    )

    home_form = _team_form(past, target.home_team_id, form_window)
    away_form = _team_form(past, target.away_team_id, form_window)
    head_to_head = _head_to_head(past, target.home_team_id, target.away_team_id)
    home_table, away_table = _table_points(past, target)
    elo = _elo_ratings(past)
    home_elo = elo.get(target.home_team_id, ELO_INITIAL)
    away_elo = elo.get(target.away_team_id, ELO_INITIAL)

    return {
        "home_form_points": home_form.points_avg,
        "away_form_points": away_form.points_avg,
        "home_home_form_points": _venue_form(
            past, target.home_team_id, form_window, at_home=True
        ),
        "away_away_form_points": _venue_form(
            past, target.away_team_id, form_window, at_home=False
        ),
        "home_goals_for_avg": home_form.goals_for_avg,
        "home_goals_against_avg": home_form.goals_against_avg,
        "away_goals_for_avg": away_form.goals_for_avg,
        "away_goals_against_avg": away_form.goals_against_avg,
        "h2h_home_win_rate": head_to_head.home_win_rate,
        "h2h_draw_rate": head_to_head.draw_rate,
        "h2h_away_win_rate": head_to_head.away_win_rate,
        "h2h_avg_goal_diff": head_to_head.avg_goal_diff,
        "home_table_points": home_table,
        "away_table_points": away_table,
        "table_points_diff": home_table - away_table,
        "home_rest_days": _rest_days(past, target.home_team_id, target.kickoff),
        "away_rest_days": _rest_days(past, target.away_team_id, target.kickoff),
        "home_elo": home_elo,
        "away_elo": away_elo,
        "elo_diff": home_elo - away_elo + ELO_HOME_ADVANTAGE,
    }


def match_outcome(home_goals: int, away_goals: int) -> str:
    if home_goals > away_goals:
        return OUTCOME_HOME
    if home_goals < away_goals:
        return OUTCOME_AWAY
    return OUTCOME_DRAW


def load_match_history(
    db: Session, *, before: datetime | None = None
) -> list[MatchRecord]:
    stmt = (
        select(Match)
        .options(joinedload(Match.competition))
        .where(
            Match.kickoff.is_not(None),
            Match.home_goals.is_not(None),
            Match.away_goals.is_not(None),
        )
    )
    if before is not None:
        stmt = stmt.where(Match.kickoff < before)
    matches = db.execute(stmt).scalars().all()
    return [_to_record(match) for match in matches]


def build_features(
    db: Session, match: Match, *, form_window: int = FORM_WINDOW
) -> dict[str, float]:
    if match.kickoff is None:
        raise ValueError("match must have a kickoff to build features")
    history = load_match_history(db, before=match.kickoff)
    return compute_features(_to_context(match), history, form_window=form_window)


def build_training_dataset(
    db: Session, *, form_window: int = FORM_WINDOW
) -> TrainingDataset:
    """Point-in-time features and 1X2 labels for every finished match."""
    history = sorted(
        load_match_history(db),
        key=lambda record: (record.kickoff, record.match_id),
    )

    match_ids = []
    features = []
    labels = []
    for record in history:
        context = MatchContext(
            competition_id=record.competition_id,
            season=record.season,
            home_team_id=record.home_team_id,
            away_team_id=record.away_team_id,
            kickoff=record.kickoff,
        )
        match_ids.append(record.match_id)
        features.append(compute_features(context, history, form_window=form_window))
        labels.append(match_outcome(record.home_goals, record.away_goals))

    return TrainingDataset(match_ids=match_ids, features=features, labels=labels)


def _team_form(past: Sequence[MatchRecord], team_id: int, form_window: int) -> _Form:
    appearances = [
        record
        for record in past
        if team_id in (record.home_team_id, record.away_team_id)
    ]
    recent = appearances[-form_window:]
    if not recent:
        return _Form(0.0, 0.0, 0.0)

    points = 0
    goals_for = 0
    goals_against = 0
    for record in recent:
        scored, conceded = _team_goals(record, team_id)
        points += _points(scored, conceded)
        goals_for += scored
        goals_against += conceded

    count = len(recent)
    return _Form(points / count, goals_for / count, goals_against / count)


def _venue_form(
    past: Sequence[MatchRecord], team_id: int, form_window: int, *, at_home: bool
) -> float:
    appearances = [
        record
        for record in past
        if (record.home_team_id if at_home else record.away_team_id) == team_id
    ]
    recent = appearances[-form_window:]
    if not recent:
        return 0.0

    points = 0
    for record in recent:
        scored, conceded = _team_goals(record, team_id)
        points += _points(scored, conceded)
    return points / len(recent)


def _head_to_head(
    past: Sequence[MatchRecord], home_team_id: int, away_team_id: int
) -> _HeadToHead:
    meetings = [
        record
        for record in past
        if {record.home_team_id, record.away_team_id} == {home_team_id, away_team_id}
    ]
    if not meetings:
        return _HeadToHead(0.0, 0.0, 0.0, 0.0)

    home_wins = 0
    draws = 0
    away_wins = 0
    goal_diff = 0
    for record in meetings:
        scored, conceded = _team_goals(record, home_team_id)
        goal_diff += scored - conceded
        if scored > conceded:
            home_wins += 1
        elif scored == conceded:
            draws += 1
        else:
            away_wins += 1

    count = len(meetings)
    return _HeadToHead(
        home_wins / count, draws / count, away_wins / count, goal_diff / count
    )


def _table_points(
    past: Sequence[MatchRecord], target: MatchContext
) -> tuple[float, float]:
    if target.competition_id is None or target.season is None:
        return 0.0, 0.0

    home_points = 0
    away_points = 0
    for record in past:
        if record.competition_id != target.competition_id:
            continue
        if record.season != target.season:
            continue
        if target.home_team_id in (record.home_team_id, record.away_team_id):
            scored, conceded = _team_goals(record, target.home_team_id)
            home_points += _points(scored, conceded)
        if target.away_team_id in (record.home_team_id, record.away_team_id):
            scored, conceded = _team_goals(record, target.away_team_id)
            away_points += _points(scored, conceded)
    return float(home_points), float(away_points)


def _rest_days(past: Sequence[MatchRecord], team_id: int, kickoff: datetime) -> float:
    appearances = [
        record
        for record in past
        if team_id in (record.home_team_id, record.away_team_id)
    ]
    if not appearances:
        return DEFAULT_REST_DAYS
    return float((kickoff - appearances[-1].kickoff).days)


def _elo_ratings(past: Sequence[MatchRecord]) -> dict[int, float]:
    """Replay chronological results into current Elo ratings per team.

    ``past`` is already filtered to matches before the target kickoff and sorted,
    so the returned ratings are strictly point-in-time (no leakage).
    """
    ratings: dict[int, float] = {}
    for record in past:
        home = ratings.get(record.home_team_id, ELO_INITIAL)
        away = ratings.get(record.away_team_id, ELO_INITIAL)
        expected_home = 1.0 / (
            1.0 + 10.0 ** ((away - home - ELO_HOME_ADVANTAGE) / 400.0)
        )
        if record.home_goals > record.away_goals:
            score_home = 1.0
        elif record.home_goals < record.away_goals:
            score_home = 0.0
        else:
            score_home = 0.5
        adjustment = ELO_K * (score_home - expected_home)
        ratings[record.home_team_id] = home + adjustment
        ratings[record.away_team_id] = away - adjustment
    return ratings


def _team_goals(record: MatchRecord, team_id: int) -> tuple[int, int]:
    if record.home_team_id == team_id:
        return record.home_goals, record.away_goals
    return record.away_goals, record.home_goals


def _points(scored: int, conceded: int) -> int:
    if scored > conceded:
        return WIN_POINTS
    if scored == conceded:
        return DRAW_POINTS
    return LOSS_POINTS


def _to_record(match: Match) -> MatchRecord:
    return MatchRecord(
        match_id=match.id,
        competition_id=match.competition_id,
        season=match.competition.season if match.competition else None,
        home_team_id=match.home_team_id,
        away_team_id=match.away_team_id,
        kickoff=match.kickoff,
        home_goals=match.home_goals,
        away_goals=match.away_goals,
    )


def _to_context(match: Match) -> MatchContext:
    return MatchContext(
        competition_id=match.competition_id,
        season=match.competition.season if match.competition else None,
        home_team_id=match.home_team_id,
        away_team_id=match.away_team_id,
        kickoff=match.kickoff,
    )
