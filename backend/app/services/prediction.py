from __future__ import annotations

"""Predictie-service (EPIC-3 / Dag 3).

Laadt het getrainde model en genereert 1X2-kansen per wedstrijd.
Stub: levert voorlopig een neutrale verdeling tot het model is getraind.
"""


def predict_match(features: dict | None = None) -> dict[str, float]:
    """Geef 1X2-kansen terug. Placeholder tot het ML-model klaar is."""
    return {"home": 0.40, "draw": 0.28, "away": 0.32}
