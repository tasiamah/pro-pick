from __future__ import annotations

from datetime import datetime

import pytest
from sqlalchemy import create_engine, func, or_, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base
from app.models import Competition, Match, Odds, Prediction, Team, ValueBet
from app.services.demo_seed import (
    DEMO_FEATURED_MATCH_EXTERNAL_ID,
    DEMO_MODEL_VERSION,
    purge_demo_seed,
    run_demo_seed,
)

pytestmark = pytest.mark.unit


@pytest.fixture
def db_session() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def test_run_demo_seed_is_idempotent(db_session: Session) -> None:
    now = datetime(2026, 6, 26, 12, 0)

    first = run_demo_seed(db_session, now=now)
    second = run_demo_seed(db_session, now=now)

    assert first.matches == second.matches == 12
    assert db_session.scalar(select(func.count()).select_from(Match)) == 12
    assert db_session.scalar(select(func.count()).select_from(Team)) == 4
    assert db_session.scalar(select(func.count()).select_from(Prediction)) == 2
    assert db_session.scalar(select(func.count()).select_from(Odds)) == 2
    assert db_session.scalar(select(func.count()).select_from(ValueBet)) == 2


def test_run_demo_seed_creates_bournemouth_vs_luton_fixture(
    db_session: Session,
) -> None:
    now = datetime(2026, 6, 26, 12, 0)

    run_demo_seed(db_session, now=now)

    match = db_session.scalar(
        select(Match).where(Match.external_id == DEMO_FEATURED_MATCH_EXTERNAL_ID)
    )
    assert match is not None
    assert match.home_team.name == "Bournemouth"
    assert match.away_team.name == "Luton"
    assert match.status == "scheduled"

    prediction_count = db_session.scalar(
        select(func.count()).where(
            Prediction.match_id == match.id,
            Prediction.model_version == DEMO_MODEL_VERSION,
        )
    )
    assert prediction_count == 1

    odds_count = db_session.scalar(
        select(func.count()).where(Odds.match_id == match.id)
    )
    assert odds_count == 1

    value_bets = db_session.scalars(
        select(ValueBet).where(ValueBet.match_id == match.id)
    ).all()
    assert value_bets

    form_matches = db_session.scalars(
        select(Match).where(
            Match.status == "finished",
            Match.kickoff < match.kickoff,
            or_(
                Match.home_team_id == match.home_team_id,
                Match.away_team_id == match.home_team_id,
            ),
        )
    ).all()
    assert form_matches


def test_purge_demo_seed_removes_demo_data_only(db_session: Session) -> None:
    now = datetime(2026, 6, 26, 12, 0)
    run_demo_seed(db_session, now=now)

    real_competition = Competition(
        external_id=2001, name="La Liga", country="Spain", season="2025/26"
    )
    db_session.add(real_competition)
    db_session.flush()
    home = Team(
        external_id=3001,
        name="Real Madrid",
        logo_url=None,
        competition_id=real_competition.id,
    )
    away = Team(
        external_id=3002,
        name="Barcelona",
        logo_url=None,
        competition_id=real_competition.id,
    )
    db_session.add_all([home, away])
    db_session.flush()
    real_match = Match(
        external_id=4001,
        competition_id=real_competition.id,
        home_team_id=home.id,
        away_team_id=away.id,
        kickoff=now,
        status="scheduled",
        home_goals=None,
        away_goals=None,
    )
    db_session.add(real_match)
    db_session.commit()

    summary = purge_demo_seed(db_session)

    assert summary.matches == 12
    assert summary.teams == 4
    assert summary.competitions == 1
    assert summary.predictions == 2
    assert summary.odds == 2
    assert summary.value_bets == 2

    assert db_session.scalar(select(func.count()).select_from(Match)) == 1
    assert db_session.scalar(select(func.count()).select_from(Team)) == 2
    assert db_session.scalar(select(func.count()).select_from(Competition)) == 1
    assert db_session.scalar(select(func.count()).select_from(Prediction)) == 0
    assert db_session.scalar(select(func.count()).select_from(Odds)) == 0
    assert db_session.scalar(select(func.count()).select_from(ValueBet)) == 0
    assert db_session.scalar(select(Match)) is real_match
