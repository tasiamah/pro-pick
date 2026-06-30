"""Unit tests for match notification event mapping."""

from __future__ import annotations

from types import SimpleNamespace

from app.services.match_notification_events import (
    _events_from_fixture_event,
    _events_from_status_transition,
)


def _match() -> SimpleNamespace:
    return SimpleNamespace(
        id=1,
        home_team=SimpleNamespace(name="Bologna"),
        away_team=SimpleNamespace(name="Empoli"),
        home_goals=1,
        away_goals=0,
    )


def test_status_transition_match_start() -> None:
    events = _events_from_status_transition(
        _match(),
        previous_status="scheduled",
        previous_short="NS",
        new_status="live",
        new_short="1H",
    )
    assert any(event.event_type == "match_start" for event in events)


def test_status_transition_match_end() -> None:
    events = _events_from_status_transition(
        _match(),
        previous_status="live",
        previous_short="2H",
        new_status="finished",
        new_short="FT",
    )
    assert any(event.event_type == "match_end" for event in events)


def test_fixture_goal_event_maps_goal_and_scorer() -> None:
    events = _events_from_fixture_event(
        _match(),
        {
            "type": "Goal",
            "detail": "Normal Goal",
            "time": {"elapsed": 12},
            "team": {"name": "Bologna"},
            "player": {"name": "Player A"},
            "assist": {"name": "Player B"},
        },
    )
    event_types = {event.event_type for event in events}
    assert "goal" in event_types
    assert "goalscorer" in event_types
    assert "assist" in event_types


def test_fixture_red_card_event() -> None:
    events = _events_from_fixture_event(
        _match(),
        {
            "type": "Card",
            "detail": "Red Card",
            "time": {"elapsed": 55},
            "team": {"name": "Empoli"},
            "player": {"name": "Player C"},
        },
    )
    assert events[0].event_type == "red_card"
