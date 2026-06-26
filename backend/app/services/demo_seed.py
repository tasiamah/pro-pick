"""Idempotent demo dataset for local mobile development (PP-108)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Competition, Match, Odds, Prediction, Team
from app.services.value_bets import generate_value_bets

DEMO_MODEL_VERSION = "demo-v1"
DEMO_BOOKMAKER = "Bet365"

DEMO_COMPETITION_EXTERNAL_ID = -9_001
DEMO_TEAM_BOURNEMOUTH_EXTERNAL_ID = -9_011
DEMO_TEAM_LUTON_EXTERNAL_ID = -9_012
DEMO_TEAM_PALACE_EXTERNAL_ID = -9_013
DEMO_TEAM_FULHAM_EXTERNAL_ID = -9_014

DEMO_FEATURED_MATCH_EXTERNAL_ID = -9_101
DEMO_SECONDARY_MATCH_EXTERNAL_ID = -9_102

DEMO_FORM_MATCH_EXTERNAL_IDS = (
    -9_201,
    -9_202,
    -9_203,
    -9_204,
    -9_205,
    -9_206,
    -9_207,
    -9_208,
    -9_209,
    -9_210,
)


@dataclass
class DemoSeedSummary:
    competitions: int = 0
    teams: int = 0
    matches: int = 0
    predictions: int = 0
    odds: int = 0
    value_bets: int = 0


@dataclass(frozen=True)
class _FinishedMatchSpec:
    external_id: int
    home_external_id: int
    away_external_id: int
    home_goals: int
    away_goals: int
    days_ago: int


@dataclass(frozen=True)
class _UpcomingMatchSpec:
    external_id: int
    home_external_id: int
    away_external_id: int
    days_ahead: int
    prob_home: float
    prob_draw: float
    prob_away: float
    home_odd: float
    draw_odd: float
    away_odd: float


def _get_or_create_competition(db: Session) -> Competition:
    existing = db.scalar(
        select(Competition).where(
            Competition.external_id == DEMO_COMPETITION_EXTERNAL_ID
        )
    )
    if existing is not None:
        return existing

    competition = Competition(
        external_id=DEMO_COMPETITION_EXTERNAL_ID,
        name="Premier League",
        country="England",
        season="2025/26",
    )
    db.add(competition)
    db.flush()
    return competition


def _get_or_create_team(
    db: Session,
    *,
    external_id: int,
    name: str,
    competition_id: int,
) -> Team:
    existing = db.scalar(select(Team).where(Team.external_id == external_id))
    if existing is not None:
        return existing

    team = Team(
        external_id=external_id,
        name=name,
        logo_url=None,
        competition_id=competition_id,
    )
    db.add(team)
    db.flush()
    return team


def _upsert_finished_match(
    db: Session,
    *,
    competition_id: int,
    team_ids: dict[int, int],
    spec: _FinishedMatchSpec,
    now: datetime,
) -> Match:
    existing = db.scalar(select(Match).where(Match.external_id == spec.external_id))
    kickoff = now - timedelta(days=spec.days_ago)
    values = {
        "competition_id": competition_id,
        "home_team_id": team_ids[spec.home_external_id],
        "away_team_id": team_ids[spec.away_external_id],
        "kickoff": kickoff,
        "status": "finished",
        "home_goals": spec.home_goals,
        "away_goals": spec.away_goals,
    }

    if existing is not None:
        for key, value in values.items():
            setattr(existing, key, value)
        return existing

    match = Match(external_id=spec.external_id, **values)
    db.add(match)
    db.flush()
    return match


def _upsert_upcoming_match(
    db: Session,
    *,
    competition_id: int,
    team_ids: dict[int, int],
    spec: _UpcomingMatchSpec,
    now: datetime,
) -> Match:
    existing = db.scalar(select(Match).where(Match.external_id == spec.external_id))
    kickoff = now + timedelta(days=spec.days_ahead)
    values = {
        "competition_id": competition_id,
        "home_team_id": team_ids[spec.home_external_id],
        "away_team_id": team_ids[spec.away_external_id],
        "kickoff": kickoff,
        "status": "scheduled",
        "home_goals": None,
        "away_goals": None,
    }

    if existing is not None:
        for key, value in values.items():
            setattr(existing, key, value)
        return existing

    match = Match(external_id=spec.external_id, **values)
    db.add(match)
    db.flush()
    return match


def _ensure_prediction(
    db: Session,
    match: Match,
    *,
    prob_home: float,
    prob_draw: float,
    prob_away: float,
) -> Prediction:
    existing = db.scalar(
        select(Prediction).where(
            Prediction.match_id == match.id,
            Prediction.model_version == DEMO_MODEL_VERSION,
        )
    )
    if existing is not None:
        existing.prob_home = prob_home
        existing.prob_draw = prob_draw
        existing.prob_away = prob_away
        return existing

    prediction = Prediction(
        match_id=match.id,
        model_version=DEMO_MODEL_VERSION,
        prob_home=prob_home,
        prob_draw=prob_draw,
        prob_away=prob_away,
    )
    db.add(prediction)
    db.flush()
    return prediction


def _ensure_odds(
    db: Session,
    match: Match,
    *,
    home: float,
    draw: float,
    away: float,
) -> Odds:
    existing = db.scalar(
        select(Odds).where(
            Odds.match_id == match.id,
            Odds.bookmaker == DEMO_BOOKMAKER,
        )
    )
    if existing is not None:
        existing.home = home
        existing.draw = draw
        existing.away = away
        return existing

    odds = Odds(
        match_id=match.id,
        bookmaker=DEMO_BOOKMAKER,
        home=home,
        draw=draw,
        away=away,
    )
    db.add(odds)
    db.flush()
    return odds


def _finished_match_specs() -> tuple[_FinishedMatchSpec, ...]:
    bournemouth = DEMO_TEAM_BOURNEMOUTH_EXTERNAL_ID
    luton = DEMO_TEAM_LUTON_EXTERNAL_ID
    palace = DEMO_TEAM_PALACE_EXTERNAL_ID
    fulham = DEMO_TEAM_FULHAM_EXTERNAL_ID

    return (
        _FinishedMatchSpec(
            DEMO_FORM_MATCH_EXTERNAL_IDS[0], bournemouth, palace, 2, 0, 35
        ),
        _FinishedMatchSpec(
            DEMO_FORM_MATCH_EXTERNAL_IDS[1], bournemouth, fulham, 1, 1, 28
        ),
        _FinishedMatchSpec(
            DEMO_FORM_MATCH_EXTERNAL_IDS[2], bournemouth, palace, 3, 1, 21
        ),
        _FinishedMatchSpec(
            DEMO_FORM_MATCH_EXTERNAL_IDS[3], bournemouth, fulham, 2, 1, 14
        ),
        _FinishedMatchSpec(
            DEMO_FORM_MATCH_EXTERNAL_IDS[4], luton, bournemouth, 1, 0, 7
        ),
        _FinishedMatchSpec(DEMO_FORM_MATCH_EXTERNAL_IDS[5], luton, palace, 0, 2, 34),
        _FinishedMatchSpec(DEMO_FORM_MATCH_EXTERNAL_IDS[6], luton, fulham, 1, 1, 27),
        _FinishedMatchSpec(DEMO_FORM_MATCH_EXTERNAL_IDS[7], luton, palace, 2, 0, 20),
        _FinishedMatchSpec(DEMO_FORM_MATCH_EXTERNAL_IDS[8], palace, luton, 1, 0, 13),
        _FinishedMatchSpec(DEMO_FORM_MATCH_EXTERNAL_IDS[9], luton, fulham, 1, 0, 6),
    )


def _upcoming_match_specs() -> tuple[_UpcomingMatchSpec, ...]:
    return (
        _UpcomingMatchSpec(
            DEMO_FEATURED_MATCH_EXTERNAL_ID,
            DEMO_TEAM_BOURNEMOUTH_EXTERNAL_ID,
            DEMO_TEAM_LUTON_EXTERNAL_ID,
            1,
            0.62,
            0.22,
            0.16,
            1.85,
            3.40,
            4.50,
        ),
        _UpcomingMatchSpec(
            DEMO_SECONDARY_MATCH_EXTERNAL_ID,
            DEMO_TEAM_PALACE_EXTERNAL_ID,
            DEMO_TEAM_FULHAM_EXTERNAL_ID,
            2,
            0.48,
            0.27,
            0.25,
            2.20,
            3.30,
            3.10,
        ),
    )


def run_demo_seed(db: Session, *, now: datetime | None = None) -> DemoSeedSummary:
    resolved = now or datetime.utcnow()
    summary = DemoSeedSummary()

    competition = _get_or_create_competition(db)
    summary.competitions = 1

    team_specs = (
        (DEMO_TEAM_BOURNEMOUTH_EXTERNAL_ID, "Bournemouth"),
        (DEMO_TEAM_LUTON_EXTERNAL_ID, "Luton"),
        (DEMO_TEAM_PALACE_EXTERNAL_ID, "Crystal Palace"),
        (DEMO_TEAM_FULHAM_EXTERNAL_ID, "Fulham"),
    )
    teams = {
        external_id: _get_or_create_team(
            db,
            external_id=external_id,
            name=name,
            competition_id=competition.id,
        )
        for external_id, name in team_specs
    }
    summary.teams = len(teams)

    team_ids = {external_id: team.id for external_id, team in teams.items()}

    for spec in _finished_match_specs():
        _upsert_finished_match(
            db,
            competition_id=competition.id,
            team_ids=team_ids,
            spec=spec,
            now=resolved,
        )
        summary.matches += 1

    for spec in _upcoming_match_specs():
        match = _upsert_upcoming_match(
            db,
            competition_id=competition.id,
            team_ids=team_ids,
            spec=spec,
            now=resolved,
        )
        summary.matches += 1
        _ensure_prediction(
            db,
            match,
            prob_home=spec.prob_home,
            prob_draw=spec.prob_draw,
            prob_away=spec.prob_away,
        )
        summary.predictions += 1
        _ensure_odds(
            db,
            match,
            home=spec.home_odd,
            draw=spec.draw_odd,
            away=spec.away_odd,
        )
        summary.odds += 1

        hydrated = db.scalar(
            select(Match)
            .options(
                selectinload(Match.predictions),
                selectinload(Match.odds),
            )
            .where(Match.id == match.id)
        )
        if hydrated is not None:
            summary.value_bets += len(generate_value_bets(db, hydrated))

    db.commit()
    return summary
