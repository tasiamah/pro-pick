from __future__ import annotations

from datetime import datetime, timedelta

import pytest

from app.ml.features import (
    DEFAULT_REST_DAYS,
    ELO_HOME_ADVANTAGE,
    ELO_INITIAL,
    FEATURE_COLUMNS,
    MatchContext,
    MatchRecord,
    compute_features,
    match_outcome,
)

pytestmark = pytest.mark.unit

BASE = datetime(2024, 3, 1, 15, 0)


def _record(
    match_id: int,
    days: int,
    home_team_id: int,
    away_team_id: int,
    home_goals: int,
    away_goals: int,
    *,
    competition_id: int = 1,
    season: str = "2024",
) -> MatchRecord:
    return MatchRecord(
        match_id=match_id,
        competition_id=competition_id,
        season=season,
        home_team_id=home_team_id,
        away_team_id=away_team_id,
        kickoff=BASE + timedelta(days=days),
        home_goals=home_goals,
        away_goals=away_goals,
    )


def _context(
    days: int, *, competition_id: int = 1, season: str = "2024"
) -> MatchContext:
    return MatchContext(
        competition_id=competition_id,
        season=season,
        home_team_id=1,
        away_team_id=2,
        kickoff=BASE + timedelta(days=days),
    )


def test_compute_features_returns_all_columns_in_order() -> None:
    features = compute_features(_context(days=10), [])

    assert list(features.keys()) == FEATURE_COLUMNS


def test_empty_history_yields_neutral_defaults() -> None:
    features = compute_features(_context(days=10), [])

    assert features["home_form_points"] == 0.0
    assert features["h2h_home_win_rate"] == 0.0
    assert features["home_table_points"] == 0.0
    assert features["table_points_diff"] == 0.0
    assert features["home_rest_days"] == DEFAULT_REST_DAYS
    assert features["away_rest_days"] == DEFAULT_REST_DAYS


def test_recent_form_and_goal_averages() -> None:
    history = [
        _record(1, days=1, home_team_id=1, away_team_id=3, home_goals=2, away_goals=0),
        _record(2, days=3, home_team_id=4, away_team_id=1, home_goals=1, away_goals=0),
        _record(3, days=5, home_team_id=1, away_team_id=5, home_goals=1, away_goals=1),
    ]

    features = compute_features(_context(days=10), history)

    assert round(features["home_form_points"], 4) == round((3 + 0 + 1) / 3, 4)
    assert round(features["home_goals_for_avg"], 4) == round((2 + 0 + 1) / 3, 4)
    assert round(features["home_goals_against_avg"], 4) == round((0 + 1 + 1) / 3, 4)


def test_form_window_limits_to_recent_matches() -> None:
    history = [
        _record(1, days=1, home_team_id=1, away_team_id=3, home_goals=0, away_goals=3),
        _record(2, days=3, home_team_id=1, away_team_id=4, home_goals=2, away_goals=0),
        _record(3, days=5, home_team_id=1, away_team_id=5, home_goals=2, away_goals=0),
    ]

    features = compute_features(_context(days=10), history, form_window=2)

    assert features["home_form_points"] == 3.0


def test_venue_form_uses_only_home_or_away_appearances() -> None:
    history = [
        _record(1, days=1, home_team_id=1, away_team_id=3, home_goals=3, away_goals=0),
        _record(2, days=2, home_team_id=4, away_team_id=1, home_goals=0, away_goals=0),
        _record(3, days=3, home_team_id=5, away_team_id=2, home_goals=0, away_goals=2),
        _record(4, days=4, home_team_id=2, away_team_id=6, home_goals=0, away_goals=1),
    ]

    features = compute_features(_context(days=10), history)

    assert features["home_home_form_points"] == 3.0
    assert features["away_away_form_points"] == 3.0


def test_head_to_head_rates_and_goal_diff() -> None:
    history = [
        _record(1, days=1, home_team_id=1, away_team_id=2, home_goals=2, away_goals=1),
        _record(2, days=2, home_team_id=2, away_team_id=1, home_goals=3, away_goals=0),
        _record(3, days=3, home_team_id=1, away_team_id=2, home_goals=1, away_goals=1),
    ]

    features = compute_features(_context(days=10), history)

    assert round(features["h2h_home_win_rate"], 4) == round(1 / 3, 4)
    assert round(features["h2h_draw_rate"], 4) == round(1 / 3, 4)
    assert round(features["h2h_away_win_rate"], 4) == round(1 / 3, 4)
    assert round(features["h2h_avg_goal_diff"], 4) == round((1 - 3 + 0) / 3, 4)


def test_table_points_count_only_same_competition_and_season() -> None:
    history = [
        _record(1, days=1, home_team_id=1, away_team_id=7, home_goals=2, away_goals=0),
        _record(2, days=2, home_team_id=2, away_team_id=8, home_goals=1, away_goals=1),
        _record(
            3,
            days=3,
            home_team_id=1,
            away_team_id=9,
            home_goals=5,
            away_goals=0,
            competition_id=2,
        ),
        _record(
            4,
            days=4,
            home_team_id=1,
            away_team_id=9,
            home_goals=5,
            away_goals=0,
            season="2023",
        ),
    ]

    features = compute_features(_context(days=10), history)

    assert features["home_table_points"] == 3.0
    assert features["away_table_points"] == 1.0
    assert features["table_points_diff"] == 2.0


def test_rest_days_use_most_recent_prior_match() -> None:
    history = [
        _record(1, days=1, home_team_id=1, away_team_id=3, home_goals=1, away_goals=0),
        _record(2, days=6, home_team_id=2, away_team_id=4, home_goals=0, away_goals=0),
    ]

    features = compute_features(_context(days=10), history)

    assert features["home_rest_days"] == 9.0
    assert features["away_rest_days"] == 4.0


def test_point_in_time_excludes_future_and_same_kickoff_matches() -> None:
    history = [
        _record(1, days=1, home_team_id=1, away_team_id=3, home_goals=3, away_goals=0),
        _record(2, days=10, home_team_id=1, away_team_id=4, home_goals=0, away_goals=5),
        _record(3, days=12, home_team_id=1, away_team_id=5, home_goals=0, away_goals=5),
    ]

    features = compute_features(_context(days=10), history)

    assert features["home_form_points"] == 3.0


def test_elo_defaults_to_initial_rating_without_history() -> None:
    features = compute_features(_context(days=10), [])

    assert features["home_elo"] == ELO_INITIAL
    assert features["away_elo"] == ELO_INITIAL
    assert features["elo_diff"] == ELO_HOME_ADVANTAGE


def test_elo_rewards_winning_team_and_penalizes_loser() -> None:
    # Team 1 beats team 2 three times before the target match.
    history = [
        _record(1, days=1, home_team_id=1, away_team_id=2, home_goals=3, away_goals=0),
        _record(2, days=3, home_team_id=2, away_team_id=1, home_goals=0, away_goals=2),
        _record(3, days=5, home_team_id=1, away_team_id=2, home_goals=1, away_goals=0),
    ]

    features = compute_features(_context(days=10), history)

    assert features["home_elo"] > ELO_INITIAL
    assert features["away_elo"] < ELO_INITIAL
    # Home strength plus the home-advantage term makes the diff strongly positive.
    assert features["elo_diff"] > ELO_HOME_ADVANTAGE


def test_elo_is_point_in_time_and_excludes_future_matches() -> None:
    history = [
        _record(1, days=1, home_team_id=1, away_team_id=2, home_goals=4, away_goals=0),
        # Same-kickoff and future matches must not influence the rating.
        _record(2, days=10, home_team_id=2, away_team_id=1, home_goals=5, away_goals=0),
        _record(3, days=12, home_team_id=2, away_team_id=1, home_goals=5, away_goals=0),
    ]

    features = compute_features(_context(days=10), history)

    assert features["home_elo"] > ELO_INITIAL
    assert features["away_elo"] < ELO_INITIAL


def test_match_outcome_classifies_result() -> None:
    assert match_outcome(2, 1) == "home"
    assert match_outcome(1, 1) == "draw"
    assert match_outcome(0, 2) == "away"


def test_compute_features_rejects_non_positive_window() -> None:
    with pytest.raises(ValueError):
        compute_features(_context(days=10), [], form_window=0)


def test_table_points_require_competition_and_season() -> None:
    history = [
        MatchRecord(
            match_id=1,
            competition_id=None,
            season=None,
            home_team_id=1,
            away_team_id=7,
            kickoff=BASE + timedelta(days=1),
            home_goals=2,
            away_goals=0,
        )
    ]
    target = MatchContext(
        competition_id=None,
        season=None,
        home_team_id=1,
        away_team_id=2,
        kickoff=BASE + timedelta(days=10),
    )

    features = compute_features(target, history)

    assert features["home_table_points"] == 0.0
    assert features["away_table_points"] == 0.0
