from __future__ import annotations

from datetime import UTC, datetime

import pytest

from app.services.analytics import (
    PredictionSnapshot,
    SettledBetSnapshot,
    build_roi_trend,
    compute_accuracy,
    compute_roi,
)

pytestmark = pytest.mark.unit


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
