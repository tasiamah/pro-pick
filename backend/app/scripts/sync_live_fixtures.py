"""CLI entry point for the free-tier live fixture sync."""

from __future__ import annotations

import argparse
import sys

from app.core.database import SessionLocal
from app.services.ingestion_alerts import (
    IngestionPipelineError,
    alert_ingestion_failure,
)
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
    except IngestionPipelineError as exc:
        alert_ingestion_failure(
            source="cli.sync_live_fixtures",
            message=str(exc),
            exc_info=exc,
        )
        print(f"Live sync failed: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        alert_ingestion_failure(
            source="cli.sync_live_fixtures",
            message="Live sync failed",
            exc_info=exc,
        )
        print(f"Live sync failed: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
