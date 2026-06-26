"""CLI entry point for the local demo seed dataset."""

from __future__ import annotations

import argparse
import sys

from app.core.database import SessionLocal
from app.services.demo_seed import run_demo_seed


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Seed demo matches, form history, predictions, odds, and value bets."
        ),
    )
    parser.parse_args(argv)

    db = SessionLocal()
    try:
        summary = run_demo_seed(db)
    except Exception as exc:
        print(f"Demo seed failed: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()

    print(
        "Demo seed complete: "
        f"{summary.matches} matches, "
        f"{summary.predictions} predictions, "
        f"{summary.odds} odds rows, "
        f"{summary.value_bets} value bets."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
