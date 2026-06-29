"""CLI entry point for the local demo seed dataset."""

from __future__ import annotations

import argparse
import sys

from app.core.database import SessionLocal
from app.services.demo_seed import purge_demo_seed, run_demo_seed


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Seed demo matches, form history, predictions, odds, and value bets."
        ),
    )
    parser.add_argument(
        "--purge",
        action="store_true",
        help="Remove the demo dataset instead of seeding it.",
    )
    args = parser.parse_args(argv)

    db = SessionLocal()
    try:
        summary = purge_demo_seed(db) if args.purge else run_demo_seed(db)
    except Exception as exc:
        action = "purge" if args.purge else "seed"
        print(f"Demo {action} failed: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()

    verb = "purge complete: removed" if args.purge else "seed complete:"
    print(
        f"Demo {verb} "
        f"{summary.matches} matches, "
        f"{summary.predictions} predictions, "
        f"{summary.odds} odds rows, "
        f"{summary.value_bets} value bets."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
