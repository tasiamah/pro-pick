from __future__ import annotations

import math
from datetime import UTC, datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base
from app.models import Prediction
from app.services.analytics import (
    LOG_LOSS_EPSILON,
    PredictionProbabilities,
    PredictionSnapshot,
    SettledBetSnapshot,
    build_confidence_trend,
    build_prediction_outcome_counts,
    build_roi_trend,
    compute_accuracy,
    compute_avg_confidence,
    compute_log_loss,
    compute_roi,
    count_high_confidence_predictions,
    load_recent_prediction_probabilities,
)
from app.services.prediction import FALLBACK_VERSION

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


def test_compute_roi_returns_none_without_settled_bets():
    assert compute_roi([]) is None


def test_compute_roi_divides_profit_by_stake():
    now = datetime.now(UTC)
    settled = [
        SettledBetSnapshot(profit=2.0, recommended_stake=10.0, created_at=now),
        SettledBetSnapshot(profit=-1.0, recommended_stake=5.0, created_at=now),
    ]

    assert round(compute_roi(settled), 3) == round(1.0 / 15.0, 3)


def test_compute_accuracy_counts_correct_predictions():
    predictions = [
        PredictionSnapshot(
            prob_home=0.7,
            prob_draw=0.2,
            prob_away=0.1,
            home_goals=2,
            away_goals=1,
        ),
        PredictionSnapshot(
            prob_home=0.2,
            prob_draw=0.2,
            prob_away=0.6,
            home_goals=0,
            away_goals=1,
        ),
    ]

    assert compute_accuracy(predictions) == 1.0


def test_compute_accuracy_returns_none_without_predictions():
    assert compute_accuracy([]) is None


def test_compute_log_loss_returns_none_without_predictions() -> None:
    assert compute_log_loss([]) is None


def test_compute_log_loss_scores_probability_of_actual_outcome() -> None:
    predictions = [
        PredictionSnapshot(
            prob_home=0.7,
            prob_draw=0.2,
            prob_away=0.1,
            home_goals=2,
            away_goals=1,
        ),
        PredictionSnapshot(
            prob_home=0.2,
            prob_draw=0.2,
            prob_away=0.6,
            home_goals=0,
            away_goals=1,
        ),
    ]

    expected = (-math.log(0.7) - math.log(0.6)) / 2
    assert round(compute_log_loss(predictions), 6) == round(expected, 6)


def test_compute_log_loss_normalizes_probabilities() -> None:
    predictions = [
        PredictionSnapshot(
            prob_home=2.0,
            prob_draw=1.0,
            prob_away=1.0,
            home_goals=2,
            away_goals=0,
        )
    ]

    assert round(compute_log_loss(predictions), 6) == round(-math.log(0.5), 6)


def test_compute_log_loss_clamps_zero_probability_to_epsilon() -> None:
    predictions = [
        PredictionSnapshot(
            prob_home=0.5,
            prob_draw=0.5,
            prob_away=0.0,
            home_goals=0,
            away_goals=2,
        )
    ]

    assert compute_log_loss(predictions) == -math.log(LOG_LOSS_EPSILON)


def test_build_roi_trend_returns_cumulative_roi_by_day():
    settled = [
        SettledBetSnapshot(
            profit=1.0,
            recommended_stake=10.0,
            created_at=datetime(2026, 6, 1, 12, 0, tzinfo=UTC),
        ),
        SettledBetSnapshot(
            profit=-0.5,
            recommended_stake=5.0,
            created_at=datetime(2026, 6, 2, 12, 0, tzinfo=UTC),
        ),
    ]

    trend = build_roi_trend(settled)

    assert len(trend) == 2
    assert trend[0].date == "2026-06-01"
    assert round(trend[0].roi, 3) == 0.1
    assert trend[1].date == "2026-06-02"
    assert round(trend[1].roi, 3) == round(0.5 / 15.0, 3)


def test_build_confidence_trend_returns_percentages():
    predictions = [
        PredictionProbabilities(prob_home=0.7, prob_draw=0.2, prob_away=0.1),
        PredictionProbabilities(prob_home=0.4, prob_draw=0.35, prob_away=0.25),
    ]

    assert build_confidence_trend(predictions) == [70, 40]


def _add_prediction(db, match_id, probs, version, created_at):
    db.add(
        Prediction(
            match_id=match_id,
            model_version=version,
            prob_home=probs[0],
            prob_draw=probs[1],
            prob_away=probs[2],
            created_at=created_at,
        )
    )


def test_recent_predictions_exclude_neutral_fallback_rows(db_session):
    base = datetime(2026, 7, 1, 12, 0, 0)
    # Real model predictions (older) carry real variance.
    _add_prediction(db_session, 1, (0.62, 0.23, 0.15), "v2", base)
    _add_prediction(db_session, 2, (0.48, 0.30, 0.22), "v2", base.replace(minute=30))
    # Fallback rows (newest) are a constant 0.40/0.28/0.32 -> flat 40.
    for match_id in range(10, 15):
        _add_prediction(
            db_session,
            match_id,
            (0.40, 0.28, 0.32),
            FALLBACK_VERSION,
            base.replace(hour=13),
        )
    db_session.commit()

    recent = load_recent_prediction_probabilities(db_session)

    assert build_confidence_trend(recent) == [62, 48]


def test_recent_predictions_fall_back_when_only_fallback_rows_exist(db_session):
    base = datetime(2026, 7, 1, 12, 0, 0)
    _add_prediction(db_session, 1, (0.40, 0.28, 0.32), FALLBACK_VERSION, base)
    db_session.commit()

    recent = load_recent_prediction_probabilities(db_session)

    assert build_confidence_trend(recent) == [40]


def test_build_prediction_outcome_counts_groups_latest_predictions():
    predictions = [
        PredictionProbabilities(prob_home=0.7, prob_draw=0.2, prob_away=0.1),
        PredictionProbabilities(prob_home=0.2, prob_draw=0.5, prob_away=0.3),
        PredictionProbabilities(prob_home=0.1, prob_draw=0.2, prob_away=0.7),
    ]

    counts = build_prediction_outcome_counts(predictions)

    assert counts.home_win == 1
    assert counts.draw == 1
    assert counts.away_win == 1


def test_compute_avg_confidence_and_high_confidence_count():
    predictions = [
        PredictionProbabilities(prob_home=0.8, prob_draw=0.1, prob_away=0.1),
        PredictionProbabilities(prob_home=0.55, prob_draw=0.25, prob_away=0.2),
    ]

    assert round(compute_avg_confidence(predictions), 3) == round((0.8 + 0.55) / 2, 3)
    assert count_high_confidence_predictions(predictions, 0.7) == 1
