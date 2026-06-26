from __future__ import annotations

from datetime import datetime

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

    prediction = db_session.scalar(
        select(Prediction).where(
            Prediction.match_id == match.id,
            Prediction.model_version == DEMO_MODEL_VERSION,
        )
    )
    assert prediction is not None

    odds = db_session.scalar(select(Odds).where(Odds.match_id == match.id))
    assert odds is not None

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
