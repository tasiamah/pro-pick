"""CLI to backfill real predictions for recently finished matches.

Predictions (1X2 + BTTS/Over-Under) are only refreshed while a match is upcoming,
so matches that finished before the models/features were ready keep a stale
neutral ``fallback`` 1X2 row and never get market rows. The Completed tab then
has nothing real to show. This re-predicts finished matches within a recent
window using the active models and point-in-time features (leakage-safe), so
their picks reflect the real model across all markets. It's a cheap no-op once a
match is backfilled, and the daily sync runs it automatically.

Run it once after a fresh deploy to populate the Completed tab immediately.

Examples:
    python -m app.scripts.backfill_finished_predictions
    python -m app.scripts.backfill_finished_predictions --window-days 30
    python -m app.scripts.backfill_finished_predictions --max-matches 500
"""

from __future__ import annotations

import argparse
import sys

from app.core.database import SessionLocal
from app.services.market_prediction import (
    refresh_market_predictions_for_recent_finished,
)
from app.services.prediction import refresh_predictions_for_recent_finished


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Backfill real 1X2 + market picks for recently finished matches.",
    )
    parser.add_argument(
        "--window-days",
        type=int,
        default=None,
        help="Only backfill matches whose kickoff is within this many days. "
        "When omitted, the backfill covers the current calendar year "
        "(Jan 1 -> now) by default.",
    )
    parser.add_argument(
        "--max-matches",
        type=int,
        default=None,
        help="Cap on matches processed this run, to bound compute "
        "(default: FINISHED_BACKFILL_MAX_MATCHES).",
    )
    args = parser.parse_args(argv)

    db = SessionLocal()
    try:
        one_x_two = refresh_predictions_for_recent_finished(
            db,
            window_days=args.window_days,
            max_matches=args.max_matches,
        )
        markets = refresh_market_predictions_for_recent_finished(
            db,
            window_days=args.window_days,
            max_matches=args.max_matches,
        )
        print(
            "Finished-match backfill complete: "
            f"{one_x_two} 1X2 predictions, {markets} market predictions written."
        )
    except Exception as exc:
        print(f"Finished-match backfill failed: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
