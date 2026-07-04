"""Integration tests: model-backed prediction service (PP-58)."""

from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timedelta
from pathlib import Path

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.ml.baseline import train_baseline_model
from app.ml.features import MARKET_FEATURE_COLUMNS, build_features, build_training_dataset
from app.ml.storage import ModelBundle, ModelMetadata
from app.models import Competition, Match, Prediction, Team
from app.services.prediction import (
    FALLBACK_VERSION,
    generate_prediction,
    predict_match,
    refresh_predictions_for_upcoming,
    reset_model_cache,
    value_bet_probabilities,
)

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


def _seed(db: Session) -> Match:
    competition = Competition(name="Service League", country="Testland", season="2024")
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
    upcoming = Match(
        competition_id=competition.id,
        home_team_id=teams[0].id,
        away_team_id=teams[1].id,
        kickoff=BASE + timedelta(days=30),
        status="scheduled",
    )
    db.add(upcoming)
    db.commit()
    return upcoming


def _trained_bundle(db: Session) -> ModelBundle:
    model = train_baseline_model(build_training_dataset(db))
    return ModelBundle(
        model=model,
        metadata=ModelMetadata(
            version="test-v1",
            algorithm="logistic",
            trained_at="2024-03-01T12:00:00+00:00",
            n_samples=len(RESULTS),
            feature_columns=[],
            metrics={"accuracy": 0.5, "log_loss": 1.0},
        ),
    )


def test_predict_match_uses_model_bundle(db_session: Session) -> None:
    upcoming = _seed(db_session)

    result = predict_match(
        db_session, upcoming, model_bundle=_trained_bundle(db_session)
    )

    assert result.model_version == "test-v1"
    probabilities = (result.prob_home, result.prob_draw, result.prob_away)
    assert all(0.0 <= value <= 1.0 for value in probabilities)
    assert round(sum(probabilities), 6) == 1.0


def test_generate_prediction_persists_row(db_session: Session) -> None:
    upcoming = _seed(db_session)

    prediction = generate_prediction(
        db_session, upcoming, model_bundle=_trained_bundle(db_session)
    )
    db_session.commit()

    stored = db_session.get(Prediction, prediction.id)
    assert stored is not None
    assert stored.match_id == upcoming.id
    assert stored.model_version == "test-v1"
    assert round(stored.prob_home + stored.prob_draw + stored.prob_away, 6) == 1.0


def test_refresh_predictions_for_upcoming_is_version_aware(db_session: Session) -> None:
    upcoming = _seed(db_session)
    bundle = _trained_bundle(db_session)

    created = refresh_predictions_for_upcoming(
        db_session, now=BASE, model_bundle=bundle
    )
    assert created == 1

    unchanged = refresh_predictions_for_upcoming(
        db_session, now=BASE, model_bundle=bundle
    )
    assert unchanged == 0

    retrained = replace(bundle, metadata=replace(bundle.metadata, version="test-v2"))
    refreshed = refresh_predictions_for_upcoming(
        db_session, now=BASE, model_bundle=retrained
    )
    assert refreshed == 1

    versions = set(
        db_session.scalars(
            select(Prediction.model_version).where(Prediction.match_id == upcoming.id)
        )
    )
    assert versions == {"test-v1", "test-v2"}


def test_refresh_predictions_for_upcoming_rewrites_on_feature_change(
    db_session: Session,
) -> None:
    upcoming = _seed(db_session)
    bundle = _trained_bundle(db_session)

    assert (
        refresh_predictions_for_upcoming(db_session, now=BASE, model_bundle=bundle) == 1
    )

    stored = db_session.scalars(
        select(Prediction).where(Prediction.match_id == upcoming.id)
    ).one()
    stored.prob_home = 0.98
    stored.prob_draw = 0.01
    stored.prob_away = 0.01
    db_session.commit()

    refreshed = refresh_predictions_for_upcoming(
        db_session, now=BASE, model_bundle=bundle
    )

    assert refreshed == 1
    assert db_session.query(Prediction).filter_by(match_id=upcoming.id).count() == 2


def test_predict_match_falls_back_without_model(
    db_session: Session, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    upcoming = _seed(db_session)
    monkeypatch.setattr(settings, "model_path", str(tmp_path / "absent.pkl"))
    # Also hide the shipped baseline so we exercise the true no-model fallback.
    monkeypatch.setattr(
        "app.ml.storage.PRETRAINED_MODEL_PATH", tmp_path / "absent-baseline.pkl"
    )
    reset_model_cache()

    result = predict_match(db_session, upcoming)
    reset_model_cache()

    assert result.model_version == FALLBACK_VERSION
    assert (result.prob_home, result.prob_draw, result.prob_away) == (0.40, 0.28, 0.32)


def test_value_bet_probabilities_uses_zeroed_market_features(
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    upcoming = _seed(db_session)
    bundle = _trained_bundle(db_session)
    captured: dict[str, float] = {}

    original_build_features = build_features

    def spy_build_features(db, match, **kwargs):
        features = original_build_features(db, match, **kwargs)
        if kwargs.get("include_market") is False:
            captured.update(
                {column: features[column] for column in MARKET_FEATURE_COLUMNS}
            )
        return features

    monkeypatch.setattr("app.services.prediction.build_features", spy_build_features)

    stats = value_bet_probabilities(db_session, upcoming, model_bundle=bundle)

    assert stats is not None
    assert captured["has_market_odds"] == 0.0
    assert captured["market_prob_home"] == 0.0
