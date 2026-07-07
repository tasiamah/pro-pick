"""CLI entry point for importing historical fixtures, scores, and odds."""

from __future__ import annotations

import argparse
import sys
from datetime import datetime

from app.core.database import SessionLocal
from app.services.historical_import import (
    DEFAULT_LEAGUE_IDS,
    DEFAULT_SEASONS,
    HistoricalDataImporter,
)


def _parse_since(raw: str) -> datetime:
    try:
        return datetime.strptime(raw, "%Y-%m-%d")
    except ValueError as exc:
        raise argparse.ArgumentTypeError(
            f"--since must be a date in YYYY-MM-DD format, got {raw!r}"
        ) from exc


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
    parser.add_argument(
        "--since",
        type=_parse_since,
        default=None,
        metavar="YYYY-MM-DD",
        help=(
            "Only import fixtures kicking off on or after this date (UTC). "
            "The season is still fetched in one call, but earlier fixtures are "
            "skipped, e.g. --season 2025 --since 2026-01-01 keeps only 2026 games."
        ),
    )
    args = parser.parse_args(argv)

    league_ids = tuple(args.leagues) if args.leagues else DEFAULT_LEAGUE_IDS
    seasons = tuple(args.seasons) if args.seasons else DEFAULT_SEASONS

    def _progress(message: str) -> None:
        print(message, flush=True)

    db = SessionLocal()
    try:
        importer = HistoricalDataImporter(db, import_odds=not args.skip_odds)
        since_note = f", since {args.since.date()}" if args.since else ""
        _progress(
            f"Importing {len(league_ids)} league(s) x {len(seasons)} season(s) "
            f"(odds: {'off' if args.skip_odds else 'on'}{since_note})..."
        )
        summary = importer.import_all(
            league_ids=league_ids,
            seasons=seasons,
            progress=_progress,
            since=args.since,
        )
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
