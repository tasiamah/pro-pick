from __future__ import annotations

"""Feature engineering (EPIC-3 / Dag 3).

Bouwt features per wedstrijd: recente vorm, thuis/uit-prestaties,
doelpunten voor/tegen, head-to-head, enz. Stub voor nu.
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
    """Zet ruwe wedstrijddata om naar een feature-dict. Placeholder."""
    return {col: 0.0 for col in FEATURE_COLUMNS}
