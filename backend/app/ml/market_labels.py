"""Goal-derived labels for BTTS, Over/Under 2.5, and Double Chance markets."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.ml.features import TrainingDataset, build_training_dataset

MARKET_BTTS = "btts"
MARKET_OVER_UNDER_25 = "over_under_25"
MARKET_DOUBLE_CHANCE = "double_chance"

SUPPORTED_MARKETS: tuple[str, ...] = (
    MARKET_BTTS,
    MARKET_OVER_UNDER_25,
    MARKET_DOUBLE_CHANCE,
)

BTTS_YES = "yes"
BTTS_NO = "no"
OVER = "over"
UNDER = "under"
DC_1X = "1x"
DC_12 = "12"
DC_X2 = "x2"

MARKET_OUTCOMES: dict[str, tuple[str, ...]] = {
    MARKET_BTTS: (BTTS_YES, BTTS_NO),
    MARKET_OVER_UNDER_25: (OVER, UNDER),
    MARKET_DOUBLE_CHANCE: (DC_1X, DC_12, DC_X2),
}

NEUTRAL_PROBABILITIES: dict[str, dict[str, float]] = {
    MARKET_BTTS: {BTTS_YES: 0.50, BTTS_NO: 0.50},
    MARKET_OVER_UNDER_25: {OVER: 0.48, UNDER: 0.52},
    MARKET_DOUBLE_CHANCE: {DC_1X: 0.65, DC_12: 0.75, DC_X2: 0.55},
}


def btts_label(home_goals: int, away_goals: int) -> str:
    return BTTS_YES if home_goals >= 1 and away_goals >= 1 else BTTS_NO


def over_under_25_label(home_goals: int, away_goals: int) -> str:
    return OVER if home_goals + away_goals > 2 else UNDER


def double_chance_labels(home_goals: int, away_goals: int) -> dict[str, int]:
    """Per-outcome binary targets for the three Double Chance legs."""
    home_win = home_goals > away_goals
    draw = home_goals == away_goals
    away_win = home_goals < away_goals
    return {
        DC_1X: 1 if home_win or draw else 0,
        DC_12: 1 if home_win or away_win else 0,
        DC_X2: 1 if draw or away_win else 0,
    }


def _label_from_match_outcome(
    market: str, home_goals: int, away_goals: int
) -> str | dict[str, int]:
    if market == MARKET_BTTS:
        return btts_label(home_goals, away_goals)
    if market == MARKET_OVER_UNDER_25:
        return over_under_25_label(home_goals, away_goals)
    if market == MARKET_DOUBLE_CHANCE:
        return double_chance_labels(home_goals, away_goals)
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
        label = _label_from_match_outcome(market, match.home_goals, match.away_goals)
        labels.append(label)  # type: ignore[arg-type]

    return TrainingDataset(
        match_ids=list(base.match_ids),
        features=list(base.features),
        labels=labels,
    )


def build_double_chance_binary_targets(
    db: Session,
) -> tuple[list[dict[str, float]], dict[str, list[int]]]:
    """Feature rows plus per-leg binary targets for Double Chance training."""
    base = build_training_dataset(db)
    if not base.features:
        return [], {outcome: [] for outcome in MARKET_OUTCOMES[MARKET_DOUBLE_CHANCE]}

    from sqlalchemy import select

    from app.models import Match

    matches = {
        match.id: match
        for match in db.scalars(select(Match).where(Match.id.in_(base.match_ids))).all()
    }

    dc_outcomes = MARKET_OUTCOMES[MARKET_DOUBLE_CHANCE]
    targets: dict[str, list[int]] = {outcome: [] for outcome in dc_outcomes}
    for match_id in base.match_ids:
        match = matches[match_id]
        legs = double_chance_labels(match.home_goals, match.away_goals)
        for outcome in MARKET_OUTCOMES[MARKET_DOUBLE_CHANCE]:
            targets[outcome].append(legs[outcome])

    return list(base.features), targets


def recommended_market_outcome(market: str, probabilities: dict[str, float]) -> str:
    outcomes = MARKET_OUTCOMES[market]
    return max(outcomes, key=lambda outcome: probabilities.get(outcome, 0.0))


def market_confidence(market: str, probabilities: dict[str, float]) -> float:
    return max(probabilities.get(outcome, 0.0) for outcome in MARKET_OUTCOMES[market])
