"""Goal-derived labels for the BTTS and Over/Under 2.5 markets."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.ml.features import TrainingDataset, build_training_dataset

MARKET_BTTS = "btts"
MARKET_OVER_UNDER_25 = "over_under_25"

SUPPORTED_MARKETS: tuple[str, ...] = (
    MARKET_BTTS,
    MARKET_OVER_UNDER_25,
)

BTTS_YES = "yes"
BTTS_NO = "no"
OVER = "over"
UNDER = "under"

MARKET_OUTCOMES: dict[str, tuple[str, ...]] = {
    MARKET_BTTS: (BTTS_YES, BTTS_NO),
    MARKET_OVER_UNDER_25: (OVER, UNDER),
}

NEUTRAL_PROBABILITIES: dict[str, dict[str, float]] = {
    MARKET_BTTS: {BTTS_YES: 0.50, BTTS_NO: 0.50},
    MARKET_OVER_UNDER_25: {OVER: 0.48, UNDER: 0.52},
}


def btts_label(home_goals: int, away_goals: int) -> str:
    return BTTS_YES if home_goals >= 1 and away_goals >= 1 else BTTS_NO


def over_under_25_label(home_goals: int, away_goals: int) -> str:
    return OVER if home_goals + away_goals > 2 else UNDER


def _label_from_match_outcome(market: str, home_goals: int, away_goals: int) -> str:
    if market == MARKET_BTTS:
        return btts_label(home_goals, away_goals)
    if market == MARKET_OVER_UNDER_25:
        return over_under_25_label(home_goals, away_goals)
    raise ValueError(f"unknown market: {market}")


def build_market_training_dataset(db: Session, market: str) -> TrainingDataset:
    """Reuse the 1X2 feature rows with market-specific labels."""
    if market not in (MARKET_BTTS, MARKET_OVER_UNDER_25):
        raise ValueError(f"market {market} does not use a single-label dataset")

    base = build_training_dataset(db)
    if not base.features:
        return base

    from sqlalchemy import select

    from app.models import Match

    matches = {
        match.id: match
        for match in db.scalars(select(Match).where(Match.id.in_(base.match_ids))).all()
    }

    labels: list[str] = []
    for match_id in base.match_ids:
        match = matches[match_id]
        labels.append(
            _label_from_match_outcome(market, match.home_goals, match.away_goals)
        )

    return TrainingDataset(
        match_ids=list(base.match_ids),
        features=list(base.features),
        labels=labels,
    )


def recommended_market_outcome(market: str, probabilities: dict[str, float]) -> str:
    outcomes = MARKET_OUTCOMES[market]
    return max(outcomes, key=lambda outcome: probabilities.get(outcome, 0.0))


def market_confidence(market: str, probabilities: dict[str, float]) -> float:
    return max(probabilities.get(outcome, 0.0) for outcome in MARKET_OUTCOMES[market])
