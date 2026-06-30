"""Send a test push notification from the command line."""

from __future__ import annotations

import argparse
import sys

from app.core.database import SessionLocal
from app.services.match_notification_events import send_test_notification
from app.services.notification_keys import MATCH_NOTIFICATION_KEYS


def main() -> int:
    parser = argparse.ArgumentParser(description="Send a test Expo push notification")
    parser.add_argument("--device-id", required=True, help="Registered device ID")
    parser.add_argument("--match-id", required=True, type=int, help="Match ID")
    parser.add_argument(
        "--event-type",
        default="goal",
        choices=sorted(MATCH_NOTIFICATION_KEYS),
        help="Notification event type",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        sent, recipients, message = send_test_notification(
            db,
            device_id=args.device_id,
            match_id=args.match_id,
            event_type=args.event_type,
        )
    except Exception as exc:
        print(f"Failed to send test notification: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()

    print(f"sent={sent} recipients={recipients} message={message}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
