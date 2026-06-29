"""Batch enrichment for GET /matches list responses."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.ml.features import (
    FORM_WINDOW,
    _to_context,
    compute_features,
    load_match_history_for_teams,
)
from app.models import Match, Odds, Prediction, Team
from app.schemas.common import MatchDetailOut
from app.services.match_enrichment import (
    FORM_DISPLAY_WINDOW,
    _result_for_team,
    prediction_confidence,
    recommended_outcome,
    to_odds_out,
)


def enrich_match_list(db: Session, matches: list[Match]) -> list[MatchDetailOut]:
    if not matches:
        return []

    enricher = _MatchListEnricher(db, matches)
    return [enricher.to_match_detail(match) for match in matches]


class _MatchListEnricher:
    def __init__(self, db: Session, matches: list[Match]) -> None:
        self._db = db
        kickoffs = [match.kickoff for match in matches if match.kickoff is not None]
        self._max_kickoff = max(kickoffs) if kickoffs else datetime.utcnow()
        team_ids = {match.home_team_id for match in matches} | {
            match.away_team_id for match in matches
        }
        self._finished_matches = self._load_finished_matches(
            team_ids, self._max_kickoff
        )
        self._match_history = load_match_history_for_teams(
            db, team_ids, self._max_kickoff
        )

    def _load_finished_matches(
        self, team_ids: set[int], before: datetime
    ) -> list[Match]:
        if not team_ids:
            return []

        return list(
            self._db.scalars(
                select(Match).where(
                    Match.status == "finished",
                    Match.kickoff < before,
                    Match.home_goals.is_not(None),
                    Match.away_goals.is_not(None),
                    or_(
                        Match.home_team_id.in_(team_ids),
                        Match.away_team_id.in_(team_ids),
                    ),
                )
            ).all()
        )

    def _team_form(self, team_id: int, before: datetime | None) -> list[str]:
        if before is None:
            return []

        relevant = [
            match
            for match in self._finished_matches
            if match.kickoff < before
            and (match.home_team_id == team_id or match.away_team_id == team_id)
        ]
        relevant.sort(key=lambda match: match.kickoff, reverse=True)
        recent = relevant[:FORM_DISPLAY_WINDOW]
        return [_result_for_team(match, team_id) for match in reversed(recent)]

    def _prediction_insights(self, match: Match, prediction: Prediction) -> list[str]:
        insights: list[str] = []

        if match.kickoff is not None:
            try:
                features = compute_features(
                    _to_context(match),
                    self._match_history,
                    form_window=FORM_WINDOW,
                )
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
            f"Model leans {outcome} with {confidence:.0%} confidence "
            "based on current data."
        )
        return insights[:3]

    def to_match_detail(self, match: Match) -> MatchDetailOut:
        latest_prediction = _latest_prediction(match)
        return MatchDetailOut(
            id=match.id,
            kickoff=match.kickoff,
            status=match.status,
            home_team=self._to_team_out(match.home_team, match.kickoff),
            away_team=self._to_team_out(match.away_team, match.kickoff),
            competition_name=match.competition.name if match.competition else None,
            odds=[to_odds_out(odds) for odds in _sorted_odds(match)],
            prediction=(
                self._to_prediction_out(match, latest_prediction)
                if latest_prediction
                else None
            ),
        )

    def _to_team_out(self, team: Team, before: datetime | None):
        from app.schemas.common import TeamOut

        form = self._team_form(team.id, before)
        return TeamOut(
            id=team.id,
            name=team.name,
            logo_url=team.logo_url,
            form=form or None,
        )

    def _to_prediction_out(self, match: Match, prediction: Prediction):
        from app.schemas.common import PredictionOut

        return PredictionOut(
            match_id=prediction.match_id,
            model_version=prediction.model_version,
            prob_home=prediction.prob_home,
            prob_draw=prediction.prob_draw,
            prob_away=prediction.prob_away,
            confidence=round(prediction_confidence(prediction), 4),
            recommended_outcome=recommended_outcome(prediction),
            insights=self._prediction_insights(match, prediction),
        )


def _latest_prediction(match: Match) -> Prediction | None:
    if not match.predictions:
        return None
    return max(match.predictions, key=lambda prediction: prediction.created_at)


def _sorted_odds(match: Match) -> list[Odds]:
    return sorted(match.odds, key=lambda odds: (odds.bookmaker.lower(), odds.id))
