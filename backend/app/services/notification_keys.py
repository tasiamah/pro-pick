"""Shared notification event keys (must match mobile matchNotificationTypes)."""

from __future__ import annotations

MATCH_NOTIFICATION_KEYS: frozenset[str] = frozenset(
    {
        "goal",
        "goalscorer",
        "assist",
        "match_start",
        "match_end",
        "penalty",
        "lineups_confirmed",
        "red_card",
        "yellow_card",
        "substitution",
        "var_decision",
        "half_time",
    }
)
