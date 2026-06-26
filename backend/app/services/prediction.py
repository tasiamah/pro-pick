"""Prediction service: model-backed 1X2 probabilities (EPIC-3 / PP-58).

Loads the persisted, versioned model once and reuses it to turn a match's
point-in-time features into home/draw/away probabilities. When no model is
available yet (or a match has no kickoff), it returns a neutral distribution
tagged with a fallback version so callers keep working before training runs.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.ml.baseline import predict_outcome_probabilities
from app.ml.features import build_features
from app.ml.storage import DEFAULT_MODEL_PATH, ModelBundle, load_model
from app.models import Match, Prediction

NEUTRAL_PROBABILITIES = {"home": 0.40, "draw": 0.28, "away": 0.32}
FALLBACK_VERSION = "fallback"


@dataclass(frozen=True)
class MatchPrediction:
    prob_home: float
    prob_draw: float
    prob_away: float
    model_version: str


@lru_cache(maxsize=1)
def load_active_model() -> ModelBundle | None:
    path = Path(settings.model_path) if settings.model_path else DEFAULT_MODEL_PATH
    return load_model(path)


def reset_model_cache() -> None:
    load_active_model.cache_clear()


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
