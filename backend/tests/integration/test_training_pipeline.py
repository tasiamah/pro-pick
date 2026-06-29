"""Integration tests: train, version, and persist a model (PP-57 / PP-55)."""

from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path

import pytest
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.ml.baseline import predict_outcome_probabilities
from app.ml.features import FEATURE_COLUMNS, build_features
from app.ml.storage import load_model
from app.ml.train import train_model
from app.models import Competition, Match, Team

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


def _seed_history(db: Session) -> None:
    competition = Competition(name="Pipeline League", country="Testland", season="2024")
    teams = [Team(name=f"Team {index}", logo_url=None) for index in range(4)]
    db.add_all([competition, *teams])
    db.flush()

    db.add_all(
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
    )
    db.commit()


def test_train_model_persists_versioned_bundle(
    db_session: Session, tmp_path: Path
) -> None:
    _seed_history(db_session)
    path = tmp_path / "model.pkl"

    bundle = train_model(db_session, algorithm="logistic", path=path)

    assert path.exists()
    assert bundle.metadata.algorithm == "logistic"
    assert bundle.metadata.version.startswith("logistic-")
    assert bundle.metadata.n_samples == len(RESULTS)
    assert bundle.metadata.feature_columns == FEATURE_COLUMNS
    assert set(bundle.metadata.metrics) == {
        "accuracy",
        "log_loss",
        "brier",
        "confident_accuracy",
        "confident_coverage",
        "confidence_threshold",
    }
    assert 0.0 <= bundle.metadata.metrics["accuracy"] <= 1.0
    assert 0.0 <= bundle.metadata.metrics["confident_accuracy"] <= 1.0
    assert 0.0 <= bundle.metadata.metrics["confident_coverage"] <= 1.0
    assert bundle.metadata.metrics["log_loss"] > 0.0
    assert bundle.metadata.evaluation == "walk_forward"
    assert bundle.metadata.calibrated is False

    reloaded = load_model(path)
    assert reloaded is not None
    assert reloaded.metadata == bundle.metadata


def test_train_model_with_xgboost_predicts(db_session: Session, tmp_path: Path) -> None:
    _seed_history(db_session)
    upcoming = Match(
        competition_id=db_session.query(Competition).one().id,
        home_team_id=db_session.query(Team).order_by(Team.id).first().id,
        away_team_id=db_session.query(Team).order_by(Team.id).all()[1].id,
        kickoff=BASE + timedelta(days=30),
        status="scheduled",
    )
    db_session.add(upcoming)
    db_session.commit()

    bundle = train_model(db_session, algorithm="xgboost", path=tmp_path / "model.pkl")
    probabilities = predict_outcome_probabilities(
        bundle.model, build_features(db_session, upcoming)
    )

    assert bundle.metadata.algorithm == "xgboost"
    assert set(probabilities) == {"home", "draw", "away"}
    assert round(sum(probabilities.values()), 6) == 1.0


def test_train_model_rejects_unknown_algorithm(db_session: Session) -> None:
    with pytest.raises(ValueError):
        train_model(db_session, algorithm="randomforest")


def test_train_model_requires_training_data(db_session: Session) -> None:
    with pytest.raises(ValueError):
        train_model(db_session, algorithm="logistic")
