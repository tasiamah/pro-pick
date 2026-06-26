"""Integration test: train the baseline model from database history."""

from __future__ import annotations

from datetime import datetime, timedelta

import pytest
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.ml.baseline import predict_outcome_probabilities, train_baseline_model
from app.ml.features import build_features, build_training_dataset
from app.models import Competition, Match, Team

pytestmark = pytest.mark.integration

BASE = datetime(2024, 3, 1, 15, 0)


@pytest.fixture
def db_session() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_train_baseline_from_history_and_predict(db_session: Session) -> None:
    competition = Competition(name="Baseline League", country="Testland", season="2024")
    teams = [Team(name=f"Team {index}", logo_url=None) for index in range(4)]
    db_session.add_all([competition, *teams])
    db_session.flush()

    results = [
        (teams[0], teams[1], 2, 0),
        (teams[1], teams[2], 0, 2),
        (teams[2], teams[3], 1, 1),
        (teams[3], teams[0], 3, 1),
        (teams[0], teams[2], 0, 0),
        (teams[1], teams[3], 1, 2),
    ]
    finished = [
        Match(
            competition_id=competition.id,
            home_team_id=home.id,
            away_team_id=away.id,
            kickoff=BASE + timedelta(days=index),
            status="finished",
            home_goals=home_goals,
            away_goals=away_goals,
        )
        for index, (home, away, home_goals, away_goals) in enumerate(results)
    ]
    upcoming = Match(
        competition_id=competition.id,
        home_team_id=teams[0].id,
        away_team_id=teams[1].id,
        kickoff=BASE + timedelta(days=30),
        status="scheduled",
    )
    db_session.add_all([*finished, upcoming])
    db_session.commit()

    model = train_baseline_model(build_training_dataset(db_session))
    probabilities = predict_outcome_probabilities(
        model, build_features(db_session, upcoming)
    )

    assert set(probabilities) == {"home", "draw", "away"}
    assert all(0.0 <= value <= 1.0 for value in probabilities.values())
    assert round(sum(probabilities.values()), 6) == 1.0
