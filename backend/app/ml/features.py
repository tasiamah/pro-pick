from __future__ import annotations

"""Feature engineering (EPIC-3 / Day 3).

Builds per-match features: recent form, home/away performance,
goals for/against, head-to-head, etc. Stub for now.
"""

FEATURE_COLUMNS: list[str] = [
    "home_form_5",
    "away_form_5",
    "home_goals_for_avg",
    "home_goals_against_avg",
    "away_goals_for_avg",
    "away_goals_against_avg",
    "h2h_home_wins",
    "h2h_away_wins",
]


def build_features(match: dict) -> dict:
    """Convert raw match data into a feature dict. Placeholder."""
    return {col: 0.0 for col in FEATURE_COLUMNS}
