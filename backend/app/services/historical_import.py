"""Import historical fixtures, final scores, and odds into the database."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Competition, Match, Odds, Team
from app.services.data_ingestion import FootballApiClient
from app.services.match_enrichment import capture_previous_odds

FINISHED_STATUS_CODES = frozenset({"FT", "AET", "PEN", "AWD", "WO"})
LIVE_STATUS_CODES = frozenset({"1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"})
MATCH_WINNER_BET_NAMES = frozenset({"Match Winner", "1X2", "Home/Draw/Away"})

DEFAULT_LEAGUE_IDS = (39, 140, 135, 78, 61)
FREE_TIER_SYNC_LEAGUE_IDS = (39, 140, 1)
DEFAULT_SEASONS = (2022, 2023, 2024)
UPCOMING_MATCH_STATUSES = frozenset({"scheduled", "live"})
FINISHED_MATCH_STATUS = "finished"


@dataclass
class ImportSummary:
    competitions: int = 0
    teams: int = 0
    matches: int = 0
    odds: int = 0

    def merge(self, other: ImportSummary) -> None:
        self.competitions += other.competitions
        self.teams += other.teams
        self.matches += other.matches
        self.odds += other.odds


def map_fixture_status(short_code: str) -> str:
    code = short_code.upper()
    if code in FINISHED_STATUS_CODES:
        return FINISHED_MATCH_STATUS
    if code in LIVE_STATUS_CODES:
        return "live"
    return "scheduled"


def parse_kickoff(raw_value: str | None) -> datetime | None:
    if not raw_value:
        return None
    normalized = raw_value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(UTC).replace(tzinfo=None)
    return parsed


def extract_match_winner_odds(
    bookmaker: dict,
) -> tuple[str, float, float, float] | None:
    name = bookmaker.get("name")
    if not name:
        return None

    for bet in bookmaker.get("bets", []):
        if bet.get("name") not in MATCH_WINNER_BET_NAMES:
            continue

        values: dict[str, float] = {}
        for item in bet.get("values", []):
            try:
                values[item["value"]] = float(item["odd"])
            except (KeyError, TypeError, ValueError):
                continue

        required = {"Home", "Draw", "Away"}
        if not required.issubset(values):
            continue

        return name, values["Home"], values["Draw"], values["Away"]

    return None


class HistoricalDataImporter:
    def __init__(
        self,
        db: Session,
        client: FootballApiClient | None = None,
        import_odds: bool = True,
        upcoming_odds_only: bool = False,
    ) -> None:
        self.db = db
        self.client = client or FootballApiClient()
        self.import_odds = import_odds
        self.upcoming_odds_only = upcoming_odds_only

    def import_all(
        self,
        league_ids: tuple[int, ...] = DEFAULT_LEAGUE_IDS,
        seasons: tuple[int, ...] = DEFAULT_SEASONS,
    ) -> ImportSummary:
        total = ImportSummary()
        for league_id in league_ids:
            for season in seasons:
                result = self.import_league_season(league_id, season)
                total.merge(result)
        return total

    def import_league_season(self, league_id: int, season: int) -> ImportSummary:
        fixtures = self.client.get_fixtures(league=league_id, season=season)
        return self.import_fixture_items(fixtures, default_season=season)

    def import_fixture_items(
        self,
        fixture_items: list[dict],
        default_season: int | None = None,
    ) -> ImportSummary:
        summary = ImportSummary()

        for fixture_item in fixture_items:
            league = fixture_item["league"]
            season = league.get("season") or default_season
            if season is None:
                kickoff = parse_kickoff(fixture_item["fixture"].get("date"))
                season = kickoff.year if kickoff is not None else datetime.now(UTC).year

            competition, competition_created = self._upsert_competition(
                fixture_item,
                int(season),
            )
            if competition_created:
                summary.competitions += 1

            home_team, home_created = self._upsert_team(
                fixture_item["teams"]["home"],
                competition.id,
            )
            away_team, away_created = self._upsert_team(
                fixture_item["teams"]["away"],
                competition.id,
            )
            if home_created:
                summary.teams += 1
            if away_created:
                summary.teams += 1

            match, match_created = self._upsert_match(
                fixture_item,
                competition.id,
                home_team.id,
                away_team.id,
            )
            if match_created:
                summary.matches += 1

            if self._should_import_odds(match):
                summary.odds += self._import_odds_for_match(match)

        self.db.commit()
        return summary

    def _should_import_odds(self, match: Match) -> bool:
        if not self.import_odds or match.external_id is None:
            return False
        if not self.upcoming_odds_only:
            return True
        return match.status in UPCOMING_MATCH_STATUSES

    def _upsert_competition(
        self,
        fixture_item: dict,
        season: int,
    ) -> tuple[Competition, bool]:
        league = fixture_item["league"]
        external_id = league["id"]
        existing = self.db.scalar(
            select(Competition).where(Competition.external_id == external_id)
        )

        if existing is not None:
            existing.name = league["name"]
            existing.country = league.get("country")
            existing.season = str(season)
            return existing, False

        competition = Competition(
            external_id=external_id,
            name=league["name"],
            country=league.get("country"),
            season=str(season),
        )
        self.db.add(competition)
        self.db.flush()
        return competition, True

    def _upsert_team(
        self,
        team_payload: dict,
        competition_id: int,
    ) -> tuple[Team, bool]:
        external_id = team_payload["id"]
        existing = self.db.scalar(select(Team).where(Team.external_id == external_id))

        if existing is not None:
            existing.name = team_payload["name"]
            existing.logo_url = team_payload.get("logo")
            existing.competition_id = competition_id
            return existing, False

        team = Team(
            external_id=external_id,
            name=team_payload["name"],
            logo_url=team_payload.get("logo"),
            competition_id=competition_id,
        )
        self.db.add(team)
        self.db.flush()
        return team, True

    def _upsert_match(
        self,
        fixture_item: dict,
        competition_id: int,
        home_team_id: int,
        away_team_id: int,
    ) -> tuple[Match, bool]:
        fixture = fixture_item["fixture"]
        external_id = fixture["id"]
        status = map_fixture_status(fixture_item["fixture"]["status"]["short"])
        goals = fixture_item.get("goals") or {}
        home_goals = goals.get("home")
        away_goals = goals.get("away")
        if home_goals is not None:
            home_goals = int(home_goals)
        if away_goals is not None:
            away_goals = int(away_goals)
        kickoff = parse_kickoff(fixture.get("date"))

        existing = self.db.scalar(select(Match).where(Match.external_id == external_id))

        if existing is not None:
            existing.competition_id = competition_id
            existing.home_team_id = home_team_id
            existing.away_team_id = away_team_id
            existing.kickoff = kickoff
            existing.status = status
            existing.home_goals = home_goals
            existing.away_goals = away_goals
            return existing, False

        match = Match(
            external_id=external_id,
            competition_id=competition_id,
            home_team_id=home_team_id,
            away_team_id=away_team_id,
            kickoff=kickoff,
            status=status,
            home_goals=home_goals,
            away_goals=away_goals,
        )
        self.db.add(match)
        self.db.flush()
        return match, True

    def _import_odds_for_match(self, match: Match) -> int:
        if match.external_id is None:
            return 0

        payload = self.client.get_odds(match.external_id)
        imported = 0

        for entry in payload:
            for bookmaker in entry.get("bookmakers", []):
                odds_values = extract_match_winner_odds(bookmaker)
                if odds_values is None:
                    continue

                name, home, draw, away = odds_values
                self._upsert_odds(match.id, name, home, draw, away)
                imported += 1

        return imported

    def _upsert_odds(
        self,
        match_id: int,
        bookmaker: str,
        home: float,
        draw: float,
        away: float,
    ) -> None:
        existing = self.db.scalar(
            select(Odds).where(
                Odds.match_id == match_id,
                Odds.bookmaker == bookmaker,
            )
        )

        if existing is not None:
            capture_previous_odds(existing, home, draw, away)
            return

        self.db.add(
            Odds(
                match_id=match_id,
                bookmaker=bookmaker,
                home=home,
                draw=draw,
                away=away,
            )
        )
