"""CLI entry point for importing historical fixtures, scores, and odds."""

from __future__ import annotations

import argparse
import sys

from app.core.database import SessionLocal
from app.services.historical_import import (
    DEFAULT_LEAGUE_IDS,
    DEFAULT_SEASONS,
    HistoricalDataImporter,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Import historical football fixtures, results, and odds.",
    )
    parser.add_argument(
        "--league",
        type=int,
        action="append",
        dest="leagues",
        help=(
            "API-Football league ID (repeatable). "
            "Defaults to top five European leagues."
        ),
    )
    parser.add_argument(
        "--season",
        type=int,
        action="append",
        dest="seasons",
        help="Season start year (repeatable). Defaults to 2022, 2023, and 2024.",
    )
    parser.add_argument(
        "--skip-odds",
        action="store_true",
        help="Import fixtures and results only (skips odds API calls).",
    )
    args = parser.parse_args(argv)

    league_ids = tuple(args.leagues) if args.leagues else DEFAULT_LEAGUE_IDS
    seasons = tuple(args.seasons) if args.seasons else DEFAULT_SEASONS

    db = SessionLocal()
    try:
        importer = HistoricalDataImporter(db, import_odds=not args.skip_odds)
        summary = importer.import_all(league_ids=league_ids, seasons=seasons)
        print(
            "Import complete: "
            f"{summary.matches} new matches, "
            f"{summary.odds} odds rows, "
            f"{summary.teams} new teams, "
            f"{summary.competitions} new competitions."
        )
    finally:
        db.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
