"""Prediction service: model-backed 1X2 probabilities (EPIC-3 / PP-58).

Loads the persisted, versioned model once and reuses it to turn a match's
point-in-time features into home/draw/away probabilities. When no model is
available yet (or a match has no kickoff), it returns a neutral distribution
tagged with a fallback version so callers keep working before training runs.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.ml.baseline import predict_outcome_probabilities
from app.ml.features import build_features
from app.ml.storage import ModelBundle, active_model_path, load_model
from app.models import Match, Prediction
from app.services.historical_import import UPCOMING_MATCH_STATUSES

NEUTRAL_PROBABILITIES = {"home": 0.40, "draw": 0.28, "away": 0.32}
FALLBACK_VERSION = "fallback"

_model_cache: tuple[float, ModelBundle | None] | None = None


@dataclass(frozen=True)
class MatchPrediction:
    prob_home: float
    prob_draw: float
    prob_away: float
    model_version: str


def load_active_model() -> ModelBundle | None:
    global _model_cache
    path = active_model_path(settings.model_path)
    try:
        modified_at = path.stat().st_mtime
    except OSError:
        return None
    if _model_cache is None or _model_cache[0] != modified_at:
        _model_cache = (modified_at, load_model(path))
    return _model_cache[1]


def reset_model_cache() -> None:
    global _model_cache
    _model_cache = None


def predict_match(
    db: Session, match: Match, *, model_bundle: ModelBundle | None = None
) -> MatchPrediction:
    bundle = model_bundle if model_bundle is not None else load_active_model()
    if bundle is None or match.kickoff is None:
        return MatchPrediction(
            prob_home=NEUTRAL_PROBABILITIES["home"],
            prob_draw=NEUTRAL_PROBABILITIES["draw"],
            prob_away=NEUTRAL_PROBABILITIES["away"],
            model_version=FALLBACK_VERSION,
        )

    probabilities = predict_outcome_probabilities(
        bundle.model, build_features(db, match)
    )
    return MatchPrediction(
        prob_home=probabilities["home"],
        prob_draw=probabilities["draw"],
        prob_away=probabilities["away"],
        model_version=bundle.metadata.version,
    )


def generate_prediction(
    db: Session, match: Match, *, model_bundle: ModelBundle | None = None
) -> Prediction:
    result = predict_match(db, match, model_bundle=model_bundle)
    prediction = Prediction(
        match_id=match.id,
        model_version=result.model_version,
        prob_home=result.prob_home,
        prob_draw=result.prob_draw,
        prob_away=result.prob_away,
    )
    db.add(prediction)
    db.flush()
    return prediction


def refresh_predictions_for_upcoming(
    db: Session, *, now: datetime | None = None, model_bundle: ModelBundle | None = None
) -> int:
    """Generate predictions for upcoming matches that lack the active version."""
    bundle = model_bundle if model_bundle is not None else load_active_model()
    if bundle is None:
        return 0

    matches = db.scalars(
        select(Match)
        .options(selectinload(Match.predictions))
        .where(
            Match.status.in_(UPCOMING_MATCH_STATUSES),
            Match.kickoff >= _naive_utc_now(now),
        )
    ).all()

    created = 0
    for match in matches:
        if _has_prediction_for_version(match, bundle.metadata.version):
            continue
        generate_prediction(db, match, model_bundle=bundle)
        created += 1

    if created:
        db.commit()
    return created


def _has_prediction_for_version(match: Match, version: str) -> bool:
    if not match.predictions:
        return False
    latest = max(match.predictions, key=lambda prediction: prediction.created_at)
    return latest.model_version == version


def _naive_utc_now(now: datetime | None) -> datetime:
    resolved = now or datetime.now(UTC)
    if resolved.tzinfo is not None:
        return resolved.astimezone(UTC).replace(tzinfo=None)
    return resolved
