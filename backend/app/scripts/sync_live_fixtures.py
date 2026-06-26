"""CLI entry point for the free-tier live fixture sync."""

from __future__ import annotations

import argparse
import sys

from app.core.database import SessionLocal
from app.services.live_sync import run_live_sync


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Sync upcoming fixtures, odds, predictions, and value bets.",
    )
    parser.add_argument(
        "--skip-odds",
        action="store_true",
        help="Import fixtures without fetching odds.",
    )
    args = parser.parse_args(argv)

    db = SessionLocal()
    try:
        summary = run_live_sync(db, import_odds=not args.skip_odds)
        import_summary = summary.import_summary
        print(
            "Live sync complete: "
            f"{summary.fixtures_fetched} fixtures, "
            f"{import_summary.matches if import_summary else 0} new matches, "
            f"{import_summary.odds if import_summary else 0} odds rows, "
            f"{summary.predictions} predictions, "
            f"{summary.value_bets} value bets."
        )
    finally:
        db.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
