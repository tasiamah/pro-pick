from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.database import get_db
from app.models import Match, Odds, Prediction
from app.schemas.common import MatchDetailOut
from app.services.match_enrichment import (
    STATUS_FILTER_MAP,
    MatchStatusFilter,
    OddsTierFilter,
    matches_odds_tier_filter,
    matches_search_filter,
    to_odds_out,
    to_prediction_out,
    to_team_out,
)
from app.services.match_list_enrichment import enrich_match_list
from app.services.value_bets import sort_odds_by_value

router = APIRouter()


def _latest_prediction(match: Match) -> Prediction | None:
    if not match.predictions:
        return None
    return max(match.predictions, key=lambda prediction: prediction.created_at)


def _primary_odds(match: Match) -> Odds | None:
    odds_rows = sort_odds_by_value(match.odds)
    if not odds_rows:
        return None
    return odds_rows[0]


def _to_match_detail(db: Session, match: Match) -> MatchDetailOut:
    latest_prediction = _latest_prediction(match)
    return MatchDetailOut(
        id=match.id,
        kickoff=match.kickoff,
        status=match.status,
        home_team=to_team_out(db, match.home_team, match.kickoff),
        away_team=to_team_out(db, match.away_team, match.kickoff),
        competition_name=match.competition.name if match.competition else None,
        odds=[to_odds_out(odds) for odds in sort_odds_by_value(match.odds)],
        prediction=(
            to_prediction_out(db, match, latest_prediction)
            if latest_prediction
            else None
        ),
    )


def _apply_kickoff_window(
    stmt,
    *,
    now: datetime,
    kickoff_from: datetime | None,
    kickoff_to: datetime | None,
    status: MatchStatusFilter | None,
):
    if kickoff_from is not None:
        stmt = stmt.where(Match.kickoff >= kickoff_from)
    elif status is None or status == "upcoming":
        stmt = stmt.where(Match.kickoff >= now)

    if kickoff_to is not None:
        stmt = stmt.where(Match.kickoff < kickoff_to)

    return stmt


@router.get("", response_model=list[MatchDetailOut])
def list_matches(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    kickoff_from: datetime | None = Query(None),
    kickoff_to: datetime | None = Query(None),
    status: MatchStatusFilter | None = Query(None),
    odds_tier: OddsTierFilter | None = Query(None),
    q: str | None = Query(None, min_length=1, max_length=100),
) -> list[MatchDetailOut]:
    """Upcoming matches with enriched prediction, odds, and filters (PP-107)."""
    now = datetime.utcnow()
    order_by = Match.kickoff.desc() if status == "completed" else Match.kickoff.asc()
    stmt = (
        select(Match)
        .options(
            joinedload(Match.home_team),
            joinedload(Match.away_team),
            joinedload(Match.competition),
            selectinload(Match.odds),
            selectinload(Match.predictions),
            selectinload(Match.market_predictions),
        )
        .order_by(order_by)
    )
    stmt = _apply_kickoff_window(
        stmt,
        now=now,
        kickoff_from=kickoff_from,
        kickoff_to=kickoff_to,
        status=status,
    )

    if status is not None:
        stmt = stmt.where(Match.status.in_(tuple(STATUS_FILTER_MAP[status])))

    if q is None and odds_tier is None:
        stmt = stmt.offset(offset).limit(limit)
        matches = db.execute(stmt).unique().scalars().all()
        return enrich_match_list(db, matches)

    matches = db.execute(stmt).unique().scalars().all()

    filtered: list[Match] = []
    for match in matches:
        if not matches_search_filter(match, q):
            continue

        latest_prediction = _latest_prediction(match)
        primary_odds = _primary_odds(match)
        if not matches_odds_tier_filter(
            match, odds_tier, latest_prediction, primary_odds
        ):
            continue

        filtered.append(match)

    page = filtered[offset : offset + limit]
    return enrich_match_list(db, page)


@router.get("/{match_id}", response_model=MatchDetailOut)
def get_match(match_id: int, db: Session = Depends(get_db)) -> MatchDetailOut:
    """Match detail including enriched odds and prediction (PP-107)."""
    match = db.execute(
        select(Match)
        .options(
            joinedload(Match.home_team),
            joinedload(Match.away_team),
            joinedload(Match.competition),
            selectinload(Match.odds),
            selectinload(Match.predictions),
            selectinload(Match.market_predictions),
        )
        .where(Match.id == match_id)
    ).scalar_one_or_none()
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")

    return _to_match_detail(db, match)
