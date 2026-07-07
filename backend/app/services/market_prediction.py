"""Market prediction service for the BTTS and Over/Under 2.5 markets."""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.ml.binary_model import predict_binary_probabilities
from app.ml.features import build_features
from app.ml.market_labels import (
    MARKET_OUTCOMES,
    NEUTRAL_PROBABILITIES,
    SUPPORTED_MARKETS,
)
from app.ml.storage import ModelBundle, active_market_model_path, load_model
from app.models import MarketPrediction, Match
from app.services.historical_import import (
    FINISHED_MATCH_STATUS,
    UPCOMING_MATCH_STATUSES,
)

FALLBACK_VERSION = "fallback"
PREDICTION_REFRESH_EPSILON = 1e-4

logger = logging.getLogger(__name__)

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
    probabilities = _predict_with_bundle(bundle, market, features)
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
) -> dict[str, float]:
    return predict_binary_probabilities(
        bundle.model,
        features,
        outcomes=MARKET_OUTCOMES[market],
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


def refresh_market_predictions_for_recent_finished(
    db: Session,
    *,
    now: datetime | None = None,
    model_bundles: dict[str, ModelBundle | None] | None = None,
    window_days: int | None = None,
    max_matches: int | None = None,
    progress: Callable[[str], None] | None = None,
) -> int:
    """Backfill BTTS/Over-Under picks for recently finished matches.

    Market predictions are only generated while a match is upcoming, so matches
    that finished before the market models ran (or were imported as finished)
    never got them, and the Completed tab has nothing to show beyond 1X2. This
    fills in missing market predictions for finished matches within a recent
    window. It only writes when a renderable row is missing, so repeat syncs are
    cheap no-ops once a match is backfilled. Predictions are point-in-time
    (features only use fixtures before kickoff), so backfilling is leakage-safe.
    """
    bundles = model_bundles or {
        market: load_active_market_model(market) for market in SUPPORTED_MARKETS
    }
    if not any(bundle is not None for bundle in bundles.values()):
        return 0

    resolved_now = _naive_utc_now(now)
    cap = (
        max_matches
        if max_matches is not None
        else settings.finished_backfill_max_matches
    )
    if cap <= 0:
        return 0
    since = (
        resolved_now - timedelta(days=window_days)
        if window_days is not None
        else settings.finished_backfill_since(resolved_now)
    )

    matches = db.scalars(
        select(Match)
        .options(selectinload(Match.market_predictions))
        .where(
            Match.status == FINISHED_MATCH_STATUS,
            Match.kickoff >= since,
            Match.kickoff < resolved_now,
        )
        .order_by(Match.kickoff.desc())
    ).all()

    if progress is not None:
        progress(
            f"market backfill: {len(matches)} finished matches in window (cap {cap})."
        )

    refreshed = 0
    processed = 0
    for match in matches:
        if processed >= cap:
            break
        missing = [
            market
            for market in SUPPORTED_MARKETS
            if bundles.get(market) is not None
            and not _has_renderable_market_prediction(match, market)
        ]
        if not missing:
            continue
        # Isolate each match: a feature-building or DB error on one match must
        # not discard other matches' work or abort the sync. Commit per match so
        # prior progress survives, and roll back only the failed match.
        try:
            for market in missing:
                result = predict_market(
                    db, match, market, model_bundle=bundles.get(market)
                )
                _persist_market_prediction(db, match, result)
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("Market backfill failed for match %s; skipping", match.id)
            continue
        processed += 1
        refreshed += len(missing)
        if progress is not None and processed % 25 == 0:
            progress(
                f"  market backfill: {processed} matches, {refreshed} rows written..."
            )

    if progress is not None:
        progress(f"market backfill: {refreshed} market rows written.")
    return refreshed


def _has_renderable_market_prediction(match: Match, market: str) -> bool:
    return any(
        row.market == market
        and isinstance(row.probabilities, dict)
        and len(row.probabilities) > 0
        for row in match.market_predictions
    )


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
