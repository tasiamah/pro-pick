"""Enriched match payloads for demo-parity API responses (PP-107)."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.ml.features import FORM_WINDOW, build_features
from app.ml.market_labels import (
    MARKET_OUTCOMES,
    market_confidence,
    recommended_market_outcome,
)
from app.models import MarketPrediction, Match, Odds, Prediction, Team
from app.schemas.common import MarketPickOut, OddsOut, PredictionOut, TeamOut

FormResult = Literal["W", "D", "L"]
RecommendedOutcome = Literal["home", "draw", "away"]
OddsMovement = Literal["up", "down", "flat"]
MatchStatusFilter = Literal["upcoming", "live", "completed"]
OddsTierFilter = Literal["all", "low", "medium", "high"]

MOVEMENT_EPSILON = 0.001
FORM_DISPLAY_WINDOW = 5

STATUS_FILTER_MAP: dict[MatchStatusFilter, frozenset[str]] = {
    "upcoming": frozenset({"scheduled"}),
    "live": frozenset({"live"}),
    "completed": frozenset({"finished"}),
}

ODDS_TIER_THRESHOLDS: tuple[tuple[float, OddsTierFilter], ...] = (
    (2.0, "low"),
    (3.5, "medium"),
)


def classify_odds_tier(decimal_odd: float) -> OddsTierFilter | None:
    if decimal_odd <= 0:
        return None

    if decimal_odd < ODDS_TIER_THRESHOLDS[0][0]:
        return "low"

    if decimal_odd < ODDS_TIER_THRESHOLDS[1][0]:
        return "medium"

    return "high"


def derive_odds_movement(
    previous: float | None,
    current: float,
) -> OddsMovement | None:
    if previous is None:
        return None

    if current > previous + MOVEMENT_EPSILON:
        return "up"

    if current < previous - MOVEMENT_EPSILON:
        return "down"

    return "flat"


def recommended_outcome(prediction: Prediction) -> RecommendedOutcome:
    if (
        prediction.prob_home >= prediction.prob_draw
        and prediction.prob_home >= prediction.prob_away
    ):
        return "home"
    if prediction.prob_draw >= prediction.prob_away:
        return "draw"
    return "away"


def prediction_confidence(prediction: Prediction) -> float:
    return max(prediction.prob_home, prediction.prob_draw, prediction.prob_away)


def _is_renderable_market_row(row: MarketPrediction) -> bool:
    """A stored market row we can actually render into a pick.

    Guards enrichment against malformed or retired market rows — an unknown
    market key (e.g. a market removed from the model, or bad data) or a missing
    probabilities blob — so a single bad row can't 500 the whole match detail or
    list response.
    """
    return (
        row.market in MARKET_OUTCOMES
        and isinstance(row.probabilities, dict)
        and len(row.probabilities) > 0
    )


def latest_market_predictions(match: Match) -> list[MarketPrediction]:
    latest_by_market: dict[str, MarketPrediction] = {}
    for row in match.market_predictions:
        if not _is_renderable_market_row(row):
            continue
        existing = latest_by_market.get(row.market)
        if existing is None or (row.created_at, row.id) > (
            existing.created_at,
            existing.id,
        ):
            latest_by_market[row.market] = row
    return list(latest_by_market.values())


def to_market_pick_out(row: MarketPrediction) -> MarketPickOut:
    probabilities = {key: float(value) for key, value in row.probabilities.items()}
    return MarketPickOut(
        market=row.market,
        model_version=row.model_version,
        probabilities=probabilities,
        recommended_outcome=recommended_market_outcome(row.market, probabilities),
        confidence=round(market_confidence(row.market, probabilities), 4),
    )


def best_market_odd(match: Match, market: str, outcome: str) -> float | None:
    """Best (highest) bookmaker price for a market outcome, or None if unpriced.

    Mirrors the 1X2 "best available price" view: a bettor takes the top price
    across books, and a longer price is what justifies relaxing the confidence
    bar for the pick.
    """
    prices = [
        row.odd
        for row in match.market_odds
        if row.market == market and row.outcome == outcome
    ]
    return max(prices) if prices else None


def build_market_picks(
    match: Match,
    db: Session | None = None,
    *,
    allow_live_prediction: bool = True,
) -> list[MarketPickOut]:
    stored = latest_market_predictions(match)
    if stored:
        picks = [to_market_pick_out(row) for row in stored]
    elif db is None or not allow_live_prediction:
        return []
    else:
        from app.services.market_prediction import predict_all_markets

        picks = [
            MarketPickOut(
                market=result.market,
                model_version=result.model_version,
                probabilities=result.probabilities,
                recommended_outcome=recommended_market_outcome(
                    result.market, result.probabilities
                ),
                confidence=round(
                    market_confidence(result.market, result.probabilities), 4
                ),
            )
            for result in predict_all_markets(db, match)
        ]

    for pick in picks:
        pick.odds = best_market_odd(match, pick.market, pick.recommended_outcome)
    return picks


def _result_for_team(match: Match, team_id: int) -> FormResult:
    if match.home_goals is None or match.away_goals is None:
        return "D"

    if match.home_team_id == team_id:
        if match.home_goals > match.away_goals:
            return "W"
        if match.home_goals < match.away_goals:
            return "L"
        return "D"

    if match.away_goals > match.home_goals:
        return "W"
    if match.away_goals < match.home_goals:
        return "L"
    return "D"


def load_team_form(
    db: Session, team_id: int, before: datetime | None
) -> list[FormResult]:
    if before is None:
        return []

    stmt = (
        select(Match)
        .where(
            Match.status == "finished",
            Match.kickoff < before,
            or_(Match.home_team_id == team_id, Match.away_team_id == team_id),
        )
        .order_by(Match.kickoff.desc())
        .limit(FORM_DISPLAY_WINDOW)
    )
    recent_matches = db.scalars(stmt).all()
    return [_result_for_team(match, team_id) for match in reversed(recent_matches)]


def build_prediction_insights(
    db: Session,
    match: Match,
    prediction: Prediction,
) -> list[str]:
    insights: list[str] = []

    try:
        features = build_features(db, match, form_window=FORM_WINDOW)
    except ValueError:
        features = None

    if features:
        home_form = features.get("home_form_points", 0.0)
        away_form = features.get("away_form_points", 0.0)
        if home_form > away_form + 0.25:
            insights.append("Home team arrives with stronger recent form.")
        elif away_form > home_form + 0.25:
            insights.append("Away team arrives with stronger recent form.")

        table_diff = features.get("table_points_diff", 0.0)
        if table_diff >= 3:
            insights.append("Home side holds a stronger league standing.")
        elif table_diff <= -3:
            insights.append("Away side holds a stronger league standing.")

    outcome = recommended_outcome(prediction)
    confidence = prediction_confidence(prediction)
    insights.append(
        f"Model leans {outcome} with {confidence:.0%} confidence based on current data."
    )

    return insights[:3]


def to_team_out(db: Session, team: Team, before: datetime | None) -> TeamOut:
    form = load_team_form(db, team.id, before)
    return TeamOut(
        id=team.id,
        name=team.name,
        logo_url=team.logo_url,
        form=form or None,
    )


def to_prediction_out(
    db: Session, match: Match, prediction: Prediction
) -> PredictionOut:
    return PredictionOut(
        match_id=prediction.match_id,
        model_version=prediction.model_version,
        prob_home=prediction.prob_home,
        prob_draw=prediction.prob_draw,
        prob_away=prediction.prob_away,
        confidence=round(prediction_confidence(prediction), 4),
        recommended_outcome=recommended_outcome(prediction),
        insights=build_prediction_insights(db, match, prediction),
        markets=build_market_picks(match, db),
    )


def to_odds_out(odds: Odds) -> OddsOut:
    return OddsOut(
        bookmaker=odds.bookmaker,
        home=odds.home,
        draw=odds.draw,
        away=odds.away,
        previous_home=odds.previous_home,
        previous_draw=odds.previous_draw,
        previous_away=odds.previous_away,
        home_movement=derive_odds_movement(odds.previous_home, odds.home),
        draw_movement=derive_odds_movement(odds.previous_draw, odds.draw),
        away_movement=derive_odds_movement(odds.previous_away, odds.away),
    )


def matches_search_filter(match: Match, query: str | None) -> bool:
    normalized = (query or "").strip().lower()
    if not normalized:
        return True

    competition_name = (match.competition.name if match.competition else "").lower()
    return (
        normalized in match.home_team.name.lower()
        or normalized in match.away_team.name.lower()
        or normalized in competition_name
    )


def matches_status_filter(match: Match, status: MatchStatusFilter | None) -> bool:
    if status is None:
        return True

    allowed = STATUS_FILTER_MAP[status]
    return match.status.lower() in allowed


def matches_odds_tier_filter(
    match: Match,
    odds_tier: OddsTierFilter | None,
    latest_prediction: Prediction | None,
    primary_odds: Odds | None,
) -> bool:
    if odds_tier is None or odds_tier == "all":
        return True

    if latest_prediction is None or primary_odds is None:
        return False

    outcome = recommended_outcome(latest_prediction)
    odd_value = {
        "home": primary_odds.home,
        "draw": primary_odds.draw,
        "away": primary_odds.away,
    }[outcome]
    tier = classify_odds_tier(odd_value)
    return tier == odds_tier


def capture_previous_odds(
    existing: Odds, home: float, draw: float, away: float
) -> None:
    if existing.home == home and existing.draw == draw and existing.away == away:
        return

    existing.previous_home = existing.home
    existing.previous_draw = existing.draw
    existing.previous_away = existing.away
    existing.home = home
    existing.draw = draw
    existing.away = away
