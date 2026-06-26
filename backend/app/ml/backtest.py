"""Walk-forward backtesting for the 1X2 model (EPIC-3 / PP-56).

Evaluates predictions out-of-sample with an expanding time window: train on
all matches up to a cut-off, predict the next block, then expand. Because the
features are already point-in-time and the model never sees a test fold's
labels, the reported metrics are honest and directly comparable to the
bookmaker's margin-removed implied probabilities on the same held-out matches.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.ml.baseline import predict_outcome_probabilities
from app.ml.evaluation import (
    EvaluationMetrics,
    ScoredOutcome,
    evaluate_scored_outcomes,
    implied_probabilities,
)
from app.ml.features import TrainingDataset, build_training_dataset
from app.models import Match

TrainFn = Callable[[TrainingDataset], Any]


@dataclass(frozen=True)
class BenchmarkResult:
    model: EvaluationMetrics
    bookmaker: EvaluationMetrics


def walk_forward_windows(
    sample_size: int, *, min_train_size: int, step: int
) -> list[tuple[int, int]]:
    windows: list[tuple[int, int]] = []
    start = max(min_train_size, 1)
    while start < sample_size:
        end = min(start + step, sample_size)
        windows.append((start, end))
        start = end
    return windows


def _resolve_schedule(
    sample_size: int, min_train_size: int | None, step: int | None
) -> tuple[int, int]:
    resolved_min = min_train_size or max(2, sample_size // 2)
    resolved_step = step or max(1, (sample_size - resolved_min) // 4)
    return resolved_min, resolved_step


def _slice_dataset(dataset: TrainingDataset, end: int) -> TrainingDataset:
    return TrainingDataset(
        match_ids=dataset.match_ids[:end],
        features=dataset.features[:end],
        labels=dataset.labels[:end],
    )


def backtest_model(
    dataset: TrainingDataset,
    *,
    train_fn: TrainFn,
    min_train_size: int | None = None,
    step: int | None = None,
) -> EvaluationMetrics:
    sample_size = len(dataset.features)
    resolved_min, resolved_step = _resolve_schedule(sample_size, min_train_size, step)

    rows: list[ScoredOutcome] = []
    for train_end, test_end in walk_forward_windows(
        sample_size, min_train_size=resolved_min, step=resolved_step
    ):
        if len(set(dataset.labels[:train_end])) < 2:
            continue
        model = train_fn(_slice_dataset(dataset, train_end))
        for index in range(train_end, test_end):
            probabilities = predict_outcome_probabilities(
                model, dataset.features[index]
            )
            rows.append((probabilities, dataset.labels[index]))

    return evaluate_scored_outcomes(rows)


def backtest_against_bookmaker(
    db: Session,
    *,
    train_fn: TrainFn,
    min_train_size: int | None = None,
    step: int | None = None,
) -> BenchmarkResult:
    dataset = build_training_dataset(db)
    sample_size = len(dataset.features)
    resolved_min, resolved_step = _resolve_schedule(sample_size, min_train_size, step)
    odds_by_match = _implied_probabilities_by_match(db)

    model_rows: list[ScoredOutcome] = []
    bookmaker_rows: list[ScoredOutcome] = []
    for train_end, test_end in walk_forward_windows(
        sample_size, min_train_size=resolved_min, step=resolved_step
    ):
        if len(set(dataset.labels[:train_end])) < 2:
            continue
        model = train_fn(_slice_dataset(dataset, train_end))
        for index in range(train_end, test_end):
            implied = odds_by_match.get(dataset.match_ids[index])
            if implied is None:
                continue
            outcome = dataset.labels[index]
            model_rows.append(
                (predict_outcome_probabilities(model, dataset.features[index]), outcome)
            )
            bookmaker_rows.append((implied, outcome))

    return BenchmarkResult(
        model=evaluate_scored_outcomes(model_rows),
        bookmaker=evaluate_scored_outcomes(bookmaker_rows),
    )


def _implied_probabilities_by_match(db: Session) -> dict[int, dict[str, float]]:
    matches = (
        db.execute(
            select(Match)
            .options(selectinload(Match.odds))
            .where(
                Match.home_goals.is_not(None),
                Match.away_goals.is_not(None),
            )
        )
        .scalars()
        .all()
    )
    implied: dict[int, dict[str, float]] = {}
    for match in matches:
        if not match.odds:
            continue
        odds = match.odds[0]
        if odds.home <= 0 or odds.draw <= 0 or odds.away <= 0:
            continue
        implied[match.id] = implied_probabilities(odds.home, odds.draw, odds.away)
    return implied
