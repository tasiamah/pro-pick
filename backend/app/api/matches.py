from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.database import get_db
from app.models import Match, Odds, Prediction
from app.schemas.common import (
    MatchDetailOut,
    MatchOut,
    OddsOut,
    PredictionOut,
    TeamOut,
)

router = APIRouter()


def _to_match_out(match: Match) -> MatchOut:
    return MatchOut(
        id=match.id,
        kickoff=match.kickoff,
        status=match.status,
        home_team=TeamOut.model_validate(match.home_team),
        away_team=TeamOut.model_validate(match.away_team),
        competition_name=match.competition.name if match.competition else None,
    )


def _latest_prediction(match: Match) -> Prediction | None:
    if not match.predictions:
        return None
    return max(match.predictions, key=lambda prediction: prediction.created_at)


def _sorted_odds(match: Match) -> list[Odds]:
    return sorted(match.odds, key=lambda odds: (odds.bookmaker.lower(), odds.id))


def _to_match_detail(match: Match) -> MatchDetailOut:
    latest_prediction = _latest_prediction(match)
    base = _to_match_out(match)
    return MatchDetailOut(
        **base.model_dump(),
        odds=[OddsOut.model_validate(odds) for odds in _sorted_odds(match)],
        prediction=(
            PredictionOut.model_validate(latest_prediction)
            if latest_prediction
            else None
        ),
    )


@router.get("", response_model=list[MatchDetailOut])
def list_matches(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    kickoff_from: datetime | None = Query(None),
    kickoff_to: datetime | None = Query(None),
) -> list[MatchDetailOut]:
    """Upcoming matches with prediction and odds (PP: GET /matches)."""
    now = datetime.utcnow()
    stmt = (
        select(Match)
        .options(
            joinedload(Match.home_team),
            joinedload(Match.away_team),
            joinedload(Match.competition),
            selectinload(Match.odds),
            selectinload(Match.predictions),
        )
        .order_by(Match.kickoff)
        .limit(limit)
        .offset(offset)
    )

    if kickoff_from is not None:
        stmt = stmt.where(Match.kickoff >= kickoff_from)
    else:
        stmt = stmt.where(Match.kickoff >= now)

    if kickoff_to is not None:
        stmt = stmt.where(Match.kickoff < kickoff_to)

    matches = db.execute(stmt).scalars().all()
    return [_to_match_detail(match) for match in matches]


@router.get("/{match_id}", response_model=MatchDetailOut)
def get_match(match_id: int, db: Session = Depends(get_db)) -> MatchDetailOut:
    """Match detail including odds and prediction (PP: GET /matches/{id})."""
    match = db.execute(
        select(Match)
        .options(
            joinedload(Match.home_team),
            joinedload(Match.away_team),
            joinedload(Match.competition),
            selectinload(Match.odds),
            selectinload(Match.predictions),
        )
        .where(Match.id == match_id)
    ).scalar_one_or_none()
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")

    return _to_match_detail(match)
