from __future__ import annotations

"""Prediction service (EPIC-3 / Day 3).

Loads the trained model and generates 1X2 probabilities per match.
Stub: returns a neutral distribution for now until the model is trained.
"""


def predict_match(features: dict | None = None) -> dict[str, float]:
    """Return 1X2 probabilities. Placeholder until the ML model is ready."""
    return {"home": 0.40, "draw": 0.28, "away": 0.32}
