"""CLI to backfill BTTS/Over-Under picks for recently finished matches.

Market predictions are only generated while a match is upcoming, so matches that
finished before the market models ran (or were imported as finished) never got
them, leaving the Completed tab with just the 1X2 pick. This fills in the missing
market predictions for finished matches within a recent window so BTTS and
Over/Under 2.5 picks show up there too. Predictions are point-in-time (features
only use fixtures before kickoff), so backfilling is leakage-safe, and it only
writes when a renderable row is missing, so re-running is a cheap no-op.

Run it once after a fresh deploy; the daily sync also does this automatically.

Examples:
    python -m app.scripts.backfill_market_predictions
    python -m app.scripts.backfill_market_predictions --window-days 30
    python -m app.scripts.backfill_market_predictions --max-matches 500
"""

from __future__ import annotations

import argparse
import sys

from app.core.database import SessionLocal
from app.services.market_prediction import (
    refresh_market_predictions_for_recent_finished,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Backfill market picks for recently finished matches.",
    )
    parser.add_argument(
        "--window-days",
        type=int,
        default=None,
        help="Only backfill matches whose kickoff is within this many days "
        "(default: MARKET_BACKFILL_WINDOW_DAYS).",
    )
    parser.add_argument(
        "--max-matches",
        type=int,
        default=None,
        help="Cap on matches processed this run, to bound compute "
        "(default: MARKET_BACKFILL_MAX_MATCHES).",
    )
    args = parser.parse_args(argv)

    db = SessionLocal()
    try:
        refreshed = refresh_market_predictions_for_recent_finished(
            db,
            window_days=args.window_days,
            max_matches=args.max_matches,
        )
        print(f"Market backfill complete: {refreshed} market predictions written.")
    except Exception as exc:
        print(f"Market backfill failed: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
