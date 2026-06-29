from __future__ import annotations

from datetime import datetime, timedelta

import pytest
from sqlalchemy import create_engine, func, or_, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base
from app.models import Match, Odds, Prediction, Team, ValueBet
from app.services.demo_seed import (
    DEMO_FEATURED_MATCH_EXTERNAL_ID,
    DEMO_MODEL_VERSION,
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
    assert db_session.scalar(select(func.count()).select_from(ValueBet)) == 1


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


def test_run_demo_seed_features_a_match_kicking_off_today(
    db_session: Session,
) -> None:
    now = datetime(2026, 6, 26, 12, 0)
    start_of_day = datetime(now.year, now.month, now.day)
    end_of_day = start_of_day + timedelta(days=1)

    run_demo_seed(db_session, now=now)

    match = db_session.scalar(
        select(Match).where(Match.external_id == DEMO_FEATURED_MATCH_EXTERNAL_ID)
    )
    assert match is not None
    # Lands inside the dashboard's today window and stays in the future so the
    # today-scoped "top value bets" populate.
    assert start_of_day <= match.kickoff < end_of_day
    assert match.kickoff >= now
