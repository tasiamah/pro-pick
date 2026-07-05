"""CLI to backfill match history for teams that have too little of it.

Teams with only a few stored matches (national sides in a tournament, newly
added leagues) get near-default form/Elo/H2H features, which flattens their
predictions toward a coin flip. This fetches recent finished fixtures for the
upcoming-slate teams that fall below the history threshold (one API call per
team, results only) so the next prediction refresh has real signal.

Run it once after a fresh deploy or when a new tournament's teams appear, then
re-run the prediction refresh (or the daily sync, which does both).

Examples:
    python -m app.scripts.backfill_team_history
    python -m app.scripts.backfill_team_history --min-matches 15 --last 50
    python -m app.scripts.backfill_team_history --max-teams 40
"""

from __future__ import annotations

import argparse
import sys

from app.core.database import SessionLocal
from app.services.history_backfill import backfill_missing_team_history


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Fetch recent history for upcoming teams that lack it.",
    )
    parser.add_argument(
        "--min-matches",
        type=int,
        default=None,
        help="Backfill teams with fewer than this many stored finished matches "
        "(default: HISTORY_BACKFILL_MIN_MATCHES).",
    )
    parser.add_argument(
        "--last",
        type=int,
        default=None,
        help="How many recent fixtures to fetch per team "
        "(default: HISTORY_BACKFILL_LAST_FIXTURES).",
    )
    parser.add_argument(
        "--max-teams",
        type=int,
        default=None,
        help="Cap on teams processed this run, to bound API quota "
        "(default: HISTORY_BACKFILL_MAX_TEAMS).",
    )
    args = parser.parse_args(argv)

    db = SessionLocal()
    try:
        summary = backfill_missing_team_history(
            db,
            min_finished_matches=args.min_matches,
            last=args.last,
            max_teams=args.max_teams,
        )
        print(
            "Team-history backfill complete: "
            f"{summary.matches} matches, {summary.teams} teams, "
            f"{summary.competitions} competitions imported."
        )
    except Exception as exc:
        print(f"Team-history backfill failed: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
