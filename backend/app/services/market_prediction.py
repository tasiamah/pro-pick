"""Market prediction service for BTTS, Over/Under 2.5, and Double Chance."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.ml.binary_model import (
    predict_binary_probabilities,
    predict_multi_binary_probabilities,
)
from app.ml.features import build_features
from app.ml.market_labels import (
    MARKET_DOUBLE_CHANCE,
    MARKET_OUTCOMES,
    NEUTRAL_PROBABILITIES,
    SUPPORTED_MARKETS,
)
from app.ml.market_train import DoubleChanceModel
from app.ml.storage import ModelBundle, active_market_model_path, load_model
from app.models import MarketPrediction, Match
from app.services.historical_import import UPCOMING_MATCH_STATUSES

FALLBACK_VERSION = "fallback"
PREDICTION_REFRESH_EPSILON = 1e-4

_market_model_cache: dict[str, tuple[float, ModelBundle | None]] = {}


@dataclass(frozen=True)
class MarketMatchPrediction:
    market: str
    probabilities: dict[str, float]
    model_version: str


def load_active_market_model(market: str) -> ModelBundle | None:
    path = active_market_model_path(market, settings.model_path)
    try:
        modified_at = path.stat().st_mtime
    except OSError:
        return None

    cached = _market_model_cache.get(market)
    if cached is None or cached[0] != modified_at:
        _market_model_cache[market] = (modified_at, load_model(path))
    return _market_model_cache[market][1]


def reset_market_model_cache() -> None:
    _market_model_cache.clear()


def predict_market(
    db: Session,
    match: Match,
    market: str,
    *,
    model_bundle: ModelBundle | None = None,
) -> MarketMatchPrediction:
    if market not in SUPPORTED_MARKETS:
        raise ValueError(f"unknown market: {market}")

    bundle = (
        model_bundle if model_bundle is not None else load_active_market_model(market)
    )
    neutral = NEUTRAL_PROBABILITIES[market]
    if bundle is None or match.kickoff is None:
        return MarketMatchPrediction(
            market=market,
            probabilities=dict(neutral),
            model_version=FALLBACK_VERSION,
        )

    features = build_features(db, match)
    probabilities = _predict_with_bundle(bundle, market, features, neutral)
    return MarketMatchPrediction(
        market=market,
        probabilities=probabilities,
        model_version=bundle.metadata.version,
    )


def predict_all_markets(
    db: Session,
    match: Match,
    *,
    model_bundles: dict[str, ModelBundle | None] | None = None,
) -> list[MarketMatchPrediction]:
    bundles = model_bundles or {}
    return [
        predict_market(
            db,
            match,
            market,
            model_bundle=bundles.get(market),
        )
        for market in SUPPORTED_MARKETS
    ]


def _predict_with_bundle(
    bundle: ModelBundle,
    market: str,
    features: dict[str, float],
    neutral: dict[str, float],
) -> dict[str, float]:
    outcomes = MARKET_OUTCOMES[market]
    if market == MARKET_DOUBLE_CHANCE:
        dc_model = bundle.model
        if not isinstance(dc_model, DoubleChanceModel):
            return dict(neutral)
        return predict_multi_binary_probabilities(
            dc_model.models,
            features,
            outcomes=outcomes,
            neutral=neutral,
        )

    return predict_binary_probabilities(
        bundle.model,
        features,
        outcomes=outcomes,
    )


def _persist_market_prediction(
    db: Session, match: Match, result: MarketMatchPrediction
) -> MarketPrediction:
    row = MarketPrediction(
        match_id=match.id,
        market=result.market,
        model_version=result.model_version,
        probabilities=result.probabilities,
    )
    db.add(row)
    db.flush()
    return row


def refresh_market_predictions_for_upcoming(
    db: Session,
    *,
    now: datetime | None = None,
    model_bundles: dict[str, ModelBundle | None] | None = None,
) -> int:
    bundles = model_bundles or {
        market: load_active_market_model(market) for market in SUPPORTED_MARKETS
    }
    if not any(bundle is not None for bundle in bundles.values()):
        return 0

    matches = db.scalars(
        select(Match)
        .options(selectinload(Match.market_predictions))
        .where(
            Match.status.in_(UPCOMING_MATCH_STATUSES),
            Match.kickoff >= _naive_utc_now(now),
        )
    ).all()

    refreshed = 0
    for match in matches:
        for market in SUPPORTED_MARKETS:
            if bundles.get(market) is None:
                continue
            result = predict_market(db, match, market, model_bundle=bundles.get(market))
            latest = _latest_market_prediction(match, market)
            if not _market_prediction_changed(latest, result):
                continue
            _persist_market_prediction(db, match, result)
            refreshed += 1

    if refreshed:
        db.commit()
    return refreshed


def _latest_market_prediction(match: Match, market: str) -> MarketPrediction | None:
    rows = [row for row in match.market_predictions if row.market == market]
    if not rows:
        return None
    return max(rows, key=lambda row: (row.created_at, row.id))


def _market_prediction_changed(
    latest: MarketPrediction | None, result: MarketMatchPrediction
) -> bool:
    if latest is None or latest.model_version != result.model_version:
        return True
    for outcome, probability in result.probabilities.items():
        previous = float(latest.probabilities.get(outcome, 0.0))
        if abs(previous - probability) > PREDICTION_REFRESH_EPSILON:
            return True
    return False


def _naive_utc_now(now: datetime | None) -> datetime:
    resolved = now or datetime.now(UTC)
    if resolved.tzinfo is not None:
        return resolved.astimezone(UTC).replace(tzinfo=None)
    return resolved
