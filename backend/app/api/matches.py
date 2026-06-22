from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Match
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


@router.get("", response_model=list[MatchOut])
def list_matches(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[MatchOut]:
    """Komende wedstrijden met basisinformatie (PP: GET /matches)."""
    stmt = select(Match).order_by(Match.kickoff).limit(limit).offset(offset)
    matches = db.execute(stmt).scalars().all()
    return [_to_match_out(m) for m in matches]


@router.get("/{match_id}", response_model=MatchDetailOut)
def get_match(match_id: int, db: Session = Depends(get_db)) -> MatchDetailOut:
    """Wedstrijddetail incl. odds en voorspelling (PP: GET /matches/{id})."""
    match = db.get(Match, match_id)
    if match is None:
        raise HTTPException(status_code=404, detail="Wedstrijd niet gevonden")

    latest_prediction = match.predictions[-1] if match.predictions else None

    base = _to_match_out(match)
    return MatchDetailOut(
        **base.model_dump(),
        odds=[OddsOut.model_validate(o) for o in match.odds],
        prediction=(
            PredictionOut.model_validate(latest_prediction)
            if latest_prediction
            else None
        ),
    )
