"""Import historical fixtures, final scores, and odds into the database."""

from __future__ import annotations

import logging
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ml.market_labels import (
    BTTS_NO,
    BTTS_YES,
    MARKET_BTTS,
    MARKET_OVER_UNDER_25,
    OVER,
    UNDER,
)
from app.models import Competition, MarketOdds, Match, Odds, Team
from app.services.data_ingestion import FootballApiClient, FootballApiError
from app.services.match_enrichment import capture_previous_odds

logger = logging.getLogger(__name__)

FINISHED_STATUS_CODES = frozenset({"FT", "AET", "PEN", "AWD", "WO"})
LIVE_STATUS_CODES = frozenset({"1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"})
MATCH_WINNER_BET_NAMES = frozenset({"Match Winner", "1X2", "Home/Draw/Away"})
BTTS_BET_NAMES = frozenset(
    {"Both Teams Score", "Both Teams To Score", "Both Teams to Score"}
)
OVER_UNDER_BET_NAMES = frozenset({"Goals Over/Under", "Over/Under"})
# API-Football labels each outcome as free text; map the ones we model to our
# canonical outcome keys. The Over/Under bet lists every line (1.5, 2.5, 3.5...),
# so we keep only the 2.5 total.
BTTS_OUTCOME_VALUES = {"yes": BTTS_YES, "no": BTTS_NO}
OVER_UNDER_OUTCOME_VALUES = {"over 2.5": OVER, "under 2.5": UNDER}

DEFAULT_LEAGUE_IDS = (39, 140, 135, 78, 61)
FREE_TIER_SYNC_LEAGUE_IDS = (39, 140, 1)
DEFAULT_SEASONS = (2022, 2023, 2024)
UPCOMING_MATCH_STATUSES = frozenset({"scheduled", "live"})
FINISHED_MATCH_STATUS = "finished"

# How many recent fixtures to pull per team when backfilling missing history.
# One API call per team; ~40 covers roughly two seasons of national-team play,
# enough to seed stable form/Elo/H2H features without burning the quota.
DEFAULT_TEAM_HISTORY_FIXTURES = 40

# Stop fetching odds for the rest of a batch after this many consecutive provider
# failures (e.g. quota exhaustion or an outage). Fixtures already imported are
# still committed; the next sync retries odds. Prevents one bad call from
# burning the remaining API quota or aborting the whole run.
MAX_CONSECUTIVE_ODDS_FAILURES = 5


@dataclass
class ImportSummary:
    competitions: int = 0
    teams: int = 0
    matches: int = 0
    odds: int = 0
    odds_failed: int = 0

    def merge(self, other: ImportSummary) -> None:
        self.competitions += other.competitions
        self.teams += other.teams
        self.matches += other.matches
        self.odds += other.odds
        self.odds_failed += other.odds_failed


def map_fixture_status(short_code: str) -> str:
    code = short_code.upper()
    if code in FINISHED_STATUS_CODES:
        return FINISHED_MATCH_STATUS
    if code in LIVE_STATUS_CODES:
        return "live"
    return "scheduled"


def _is_finished_fixture(fixture_item: dict) -> bool:
    short = fixture_item.get("fixture", {}).get("status", {}).get("short")
    if not short:
        return False
    return map_fixture_status(short) == FINISHED_MATCH_STATUS


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


def _parse_odd(raw: object) -> float | None:
    try:
        odd = float(raw)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    return odd if odd > 1.0 else None


def extract_market_odds(bookmaker: dict) -> list[tuple[str, str, float]]:
    """Pull BTTS and Over/Under 2.5 outcome prices from a bookmaker block.

    Returns ``(market, outcome, odd)`` tuples using our canonical market/outcome
    keys (e.g. ``("btts", "yes", 1.8)``). Bets other than BTTS / Over-Under, the
    non-2.5 Over/Under lines, and malformed prices are skipped, so a partial or
    unexpected payload never raises.
    """
    results: list[tuple[str, str, float]] = []
    for bet in bookmaker.get("bets", []):
        if bet.get("name") in BTTS_BET_NAMES:
            market, mapping = MARKET_BTTS, BTTS_OUTCOME_VALUES
        elif bet.get("name") in OVER_UNDER_BET_NAMES:
            market, mapping = MARKET_OVER_UNDER_25, OVER_UNDER_OUTCOME_VALUES
        else:
            continue

        for item in bet.get("values", []):
            outcome = mapping.get(str(item.get("value", "")).strip().lower())
            if outcome is None:
                continue
            odd = _parse_odd(item.get("odd"))
            if odd is not None:
                results.append((market, outcome, odd))

    return results


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
        progress: Callable[[str], None] | None = None,
        since: datetime | None = None,
    ) -> ImportSummary:
        total = ImportSummary()
        combos = [
            (league_id, season) for league_id in league_ids for season in seasons
        ]
        for index, (league_id, season) in enumerate(combos, start=1):
            if progress is not None:
                progress(
                    f"[{index}/{len(combos)}] league {league_id} season {season}: "
                    "fetching fixtures..."
                )
            result = self.import_league_season(
                league_id, season, progress=progress, since=since
            )
            if progress is not None:
                failed = (
                    f", {result.odds_failed} odds failed"
                    if result.odds_failed
                    else ""
                )
                progress(
                    f"[{index}/{len(combos)}] league {league_id} season {season}: "
                    f"done (+{result.matches} matches, +{result.odds} odds{failed})"
                )
            total.merge(result)
        return total

    def import_league_season(
        self,
        league_id: int,
        season: int,
        progress: Callable[[str], None] | None = None,
        since: datetime | None = None,
    ) -> ImportSummary:
        fixtures = self.client.get_fixtures(league=league_id, season=season)
        if progress is not None:
            progress(f"    fetched {len(fixtures)} fixtures; importing...")
        return self.import_fixture_items(
            fixtures, default_season=season, progress=progress, since=since
        )

    def import_fixture_items(
        self,
        fixture_items: list[dict],
        default_season: int | None = None,
        progress: Callable[[str], None] | None = None,
        since: datetime | None = None,
    ) -> ImportSummary:
        summary = ImportSummary()
        consecutive_odds_failures = 0
        odds_circuit_open = False
        total = len(fixture_items)

        for position, fixture_item in enumerate(fixture_items, start=1):
            league = fixture_item["league"]
            kickoff = parse_kickoff(fixture_item["fixture"].get("date"))
            # Skip fixtures before the cutoff (e.g. import only 2026 games from a
            # full 2025/26 season pull) without an extra API call.
            if since is not None and (kickoff is None or kickoff < since):
                continue
            season = league.get("season") or default_season
            if season is None:
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

            if not odds_circuit_open and self._should_import_odds(match):
                try:
                    summary.odds += self._import_odds_for_match(match)
                    consecutive_odds_failures = 0
                except (FootballApiError, httpx.HTTPError) as exc:
                    summary.odds_failed += 1
                    consecutive_odds_failures += 1
                    logger.warning(
                        "Odds import failed for fixture %s: %s",
                        match.external_id,
                        exc,
                    )
                    if consecutive_odds_failures >= MAX_CONSECUTIVE_ODDS_FAILURES:
                        odds_circuit_open = True
                        logger.warning(
                            "Pausing odds import after %s consecutive failures; "
                            "committing fixtures and skipping odds for the rest of "
                            "this batch.",
                            consecutive_odds_failures,
                        )

            if progress is not None and (position % 25 == 0 or position == total):
                progress(
                    f"      {position}/{total} fixtures "
                    f"({summary.matches} new, {summary.odds} odds)"
                )

        self.db.commit()
        return summary

    def backfill_team_history(
        self,
        team_external_ids: Sequence[int],
        *,
        last: int = DEFAULT_TEAM_HISTORY_FIXTURES,
    ) -> ImportSummary:
        """Import each team's recent finished fixtures to enrich its history.

        For teams with little history in our DB (national sides especially), the
        results-derived features (form, goals, rest days, Elo, H2H) collapse to
        near-neutral defaults, which flattens predictions toward a coin flip. This
        pulls each team's most recent finished matches across all competitions so
        those features carry real signal.

        Only finished fixtures are imported: upcoming ones would surface stray
        friendlies/qualifiers in the app, and results are all the point-in-time
        features need. Odds are not fetched here (that path is one call per match
        and quota-heavy); it relies on ``_should_import_odds`` skipping finished
        rows, so pass an importer built with ``import_odds=False`` (or
        ``upcoming_odds_only=True``). Resilient to provider errors per team.
        """
        summary = ImportSummary()
        consecutive_failures = 0

        for team_external_id in team_external_ids:
            try:
                fixtures = self.client.get_team_fixtures(team_external_id, last=last)
                consecutive_failures = 0
            except (FootballApiError, httpx.HTTPError) as exc:
                consecutive_failures += 1
                logger.warning(
                    "Team history fetch failed for team %s: %s",
                    team_external_id,
                    exc,
                )
                if consecutive_failures >= MAX_CONSECUTIVE_ODDS_FAILURES:
                    logger.warning(
                        "Stopping team-history backfill after %s consecutive "
                        "failures; committing what was fetched.",
                        consecutive_failures,
                    )
                    break
                continue

            finished = [item for item in fixtures if _is_finished_fixture(item)]
            if finished:
                summary.merge(self.import_fixture_items(finished))

        return summary

    def backfill_odds(self, matches: Sequence[Match]) -> ImportSummary:
        """Fetch and store odds for already-imported matches that lack them.

        Used to populate market features for historical training data. Resilient
        like ``import_fixture_items``: a provider error on one match is logged and
        skipped, and after repeated failures (e.g. quota exhaustion) it stops and
        commits what it has. Honors ``import_odds`` / ``upcoming_odds_only`` via
        ``_should_import_odds``.
        """
        summary = ImportSummary()
        consecutive_failures = 0

        for match in matches:
            if not self._should_import_odds(match):
                continue
            try:
                summary.odds += self._import_odds_for_match(match)
                consecutive_failures = 0
            except (FootballApiError, httpx.HTTPError) as exc:
                summary.odds_failed += 1
                consecutive_failures += 1
                logger.warning(
                    "Odds backfill failed for fixture %s: %s", match.external_id, exc
                )
                if consecutive_failures >= MAX_CONSECUTIVE_ODDS_FAILURES:
                    logger.warning(
                        "Stopping odds backfill after %s consecutive failures; "
                        "committing what was fetched.",
                        consecutive_failures,
                    )
                    break

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
                if odds_values is not None:
                    name, home, draw, away = odds_values
                    self._upsert_odds(match.id, name, home, draw, away)
                    imported += 1

                book_name = bookmaker.get("name") or "average"
                for market, outcome, odd in extract_market_odds(bookmaker):
                    self._upsert_market_odds(match.id, book_name, market, outcome, odd)

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

    def _upsert_market_odds(
        self,
        match_id: int,
        bookmaker: str,
        market: str,
        outcome: str,
        odd: float,
    ) -> None:
        existing = self.db.scalar(
            select(MarketOdds).where(
                MarketOdds.match_id == match_id,
                MarketOdds.bookmaker == bookmaker,
                MarketOdds.market == market,
                MarketOdds.outcome == outcome,
            )
        )

        if existing is not None:
            existing.odd = odd
            return

        self.db.add(
            MarketOdds(
                match_id=match_id,
                bookmaker=bookmaker,
                market=market,
                outcome=outcome,
                odd=odd,
            )
        )
