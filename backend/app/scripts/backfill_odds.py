"""CLI to backfill bookmaker odds for matches that have none.

Market features (bookmaker implied probabilities) only help the model if the
training matches actually have odds. Most historical fixtures were imported
without odds, so this script fetches odds for matches that lack them, oldest
first, and stores them. Run it before retraining so the new market features have
signal to learn from.

Examples:
    python -m app.scripts.backfill_odds --status finished --limit 2000
    python -m app.scripts.backfill_odds --status all
"""

from __future__ import annotations

import argparse
import sys

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import Match
from app.services.historical_import import (
    FINISHED_MATCH_STATUS,
    UPCOMING_MATCH_STATUSES,
    HistoricalDataImporter,
)

STATUS_CHOICES = ("all", "finished", "upcoming")


def _select_matches(db, status: str, limit: int | None) -> list[Match]:
    stmt = (
        select(Match)
        .where(Match.external_id.is_not(None), ~Match.odds.any())
        .order_by(Match.kickoff.asc())
    )
    if status == "finished":
        stmt = stmt.where(Match.status == FINISHED_MATCH_STATUS)
    elif status == "upcoming":
        stmt = stmt.where(Match.status.in_(UPCOMING_MATCH_STATUSES))
    if limit is not None:
        stmt = stmt.limit(limit)
    return list(db.scalars(stmt))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Fetch and store odds for matches that have none.",
    )
    parser.add_argument(
        "--status",
        choices=STATUS_CHOICES,
        default="finished",
        help="Which matches to backfill (default: finished).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Maximum number of matches to process (default: all). One API call "
        "per match, so cap this to stay within the daily quota.",
    )
    args = parser.parse_args(argv)

    db = SessionLocal()
    try:
        matches = _select_matches(db, args.status, args.limit)
        if not matches:
            print("No matches without odds to backfill.")
            return 0

        print(f"Backfilling odds for {len(matches)} matches ({args.status})...")
        # Defaults already fetch odds for all statuses (import_odds=True,
        # upcoming_odds_only=False), which is what a backfill needs.
        importer = HistoricalDataImporter(db)
        summary = importer.backfill_odds(matches)
        print(
            "Odds backfill complete: "
            f"{summary.odds} odds rows stored, {summary.odds_failed} matches failed."
        )
    except Exception as exc:
        print(f"Odds backfill failed: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
