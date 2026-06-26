"""Integration test: model vs bookmaker benchmark (PP-56)."""

from __future__ import annotations

from datetime import datetime, timedelta

import pytest
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.ml.baseline import train_baseline_model
from app.ml.evaluation import benchmark_against_bookmaker
from app.ml.features import build_training_dataset
from app.models import Competition, Match, Odds, Team

pytestmark = pytest.mark.integration

BASE = datetime(2024, 3, 1, 15, 0)
RESULTS = [
    (0, 1, 2, 0),
    (1, 2, 0, 2),
    (2, 3, 1, 1),
    (3, 0, 3, 1),
    (0, 2, 0, 0),
    (1, 3, 1, 2),
]


@pytest.fixture
def db_session() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_benchmark_scores_model_and_bookmaker(db_session: Session) -> None:
    competition = Competition(name="Bench League", country="Testland", season="2024")
    teams = [Team(name=f"Team {index}", logo_url=None) for index in range(4)]
    db_session.add_all([competition, *teams])
    db_session.flush()

    matches = [
        Match(
            competition_id=competition.id,
            home_team_id=teams[home].id,
            away_team_id=teams[away].id,
            kickoff=BASE + timedelta(days=index),
            status="finished",
            home_goals=home_goals,
            away_goals=away_goals,
        )
        for index, (home, away, home_goals, away_goals) in enumerate(RESULTS)
    ]
    db_session.add_all(matches)
    db_session.flush()
    db_session.add_all(
        Odds(match_id=match.id, home=2.1, draw=3.3, away=3.6) for match in matches
    )
    db_session.commit()

    model = train_baseline_model(build_training_dataset(db_session))
    result = benchmark_against_bookmaker(db_session, model)

    assert result.model.sample_size == len(RESULTS)
    assert result.bookmaker.sample_size == len(RESULTS)
    for metrics in (result.model, result.bookmaker):
        assert 0.0 <= metrics.accuracy <= 1.0
        assert metrics.log_loss > 0.0
