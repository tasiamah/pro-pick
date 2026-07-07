"""Detect match events and dispatch push notifications."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.models import Match, MatchStateSnapshot, SentNotification
from app.services.data_ingestion import FootballApiClient, FootballApiError
from app.services.expo_push import PushMessage, send_push_messages
from app.services.notification_keys import MATCH_NOTIFICATION_KEYS
from app.services.notification_preferences import get_enabled_devices_for_event
from app.services.push_token_registry import get_push_tokens_for_devices

logger = logging.getLogger(__name__)

# API-Football caps the fixtures `ids` parameter at 20 IDs per request.
_MAX_FIXTURE_IDS_PER_REQUEST = 20

EVENT_LABELS: dict[str, str] = {
    "goal": "Goal",
    "goalscorer": "Goalscorer",
    "assist": "Assist",
    "match_start": "Match Start",
    "match_end": "Match End",
    "penalty": "Penalty",
    "lineups_confirmed": "Line-Ups Confirmed",
    "red_card": "Red Card",
    "yellow_card": "Yellow Card",
    "substitution": "Start of Half",
    "var_decision": "End of Half",
    "half_time": "Penalty Shootout Reminder",
}


@dataclass(frozen=True)
class MatchNotificationEvent:
    event_type: str
    fingerprint: str
    title: str
    body: str


@dataclass
class NotificationDispatchSummary:
    events_detected: int = 0
    messages_sent: int = 0
    messages_failed: int = 0
    live_matches: int = 0


def _match_title(match: Match) -> str:
    return f"{match.home_team.name} vs {match.away_team.name}"


def _get_or_create_snapshot(db: Session, match: Match) -> MatchStateSnapshot:
    snapshot = db.scalar(
        select(MatchStateSnapshot).where(MatchStateSnapshot.match_id == match.id)
    )
    if snapshot is not None:
        return snapshot

    snapshot = MatchStateSnapshot(
        match_id=match.id,
        status=match.status,
        home_goals=match.home_goals,
        away_goals=match.away_goals,
    )
    db.add(snapshot)
    db.flush()
    return snapshot


def _already_sent(
    db: Session,
    *,
    device_id: str,
    match_id: int,
    event_type: str,
    fingerprint: str,
) -> bool:
    existing = db.scalar(
        select(SentNotification.id).where(
            SentNotification.device_id == device_id,
            SentNotification.match_id == match_id,
            SentNotification.event_type == event_type,
            SentNotification.event_fingerprint == fingerprint,
        )
    )
    return existing is not None


def _record_sent(
    db: Session,
    *,
    device_id: str,
    match_id: int,
    event_type: str,
    fingerprint: str,
) -> None:
    db.add(
        SentNotification(
            device_id=device_id,
            match_id=match_id,
            event_type=event_type,
            event_fingerprint=fingerprint,
        )
    )


def _events_from_status_transition(
    match: Match,
    *,
    previous_status: str,
    previous_short: str | None,
    new_status: str,
    new_short: str | None,
) -> list[MatchNotificationEvent]:
    title = _match_title(match)
    events: list[MatchNotificationEvent] = []

    if previous_status != "live" and new_status == "live":
        events.append(
            MatchNotificationEvent(
                event_type="match_start",
                fingerprint=f"status:{new_status}:{new_short or 'live'}",
                title=title,
                body="Kick-off! The match has started.",
            )
        )

    if previous_short != "HT" and new_short == "HT":
        events.append(
            MatchNotificationEvent(
                event_type="var_decision",
                fingerprint=f"period:HT:{datetime.now(UTC).date().isoformat()}",
                title=title,
                body="Half-time whistle.",
            )
        )

    if previous_short == "HT" and new_short == "2H":
        events.append(
            MatchNotificationEvent(
                event_type="substitution",
                fingerprint=f"period:2H:{datetime.now(UTC).date().isoformat()}",
                title=title,
                body="Second half is underway.",
            )
        )

    if new_short == "P" and previous_short != "P":
        events.append(
            MatchNotificationEvent(
                event_type="half_time",
                fingerprint=f"period:P:{datetime.now(UTC).date().isoformat()}",
                title=title,
                body="Penalty shootout is about to begin.",
            )
        )

    if previous_status != "finished" and new_status == "finished":
        score = ""
        if match.home_goals is not None and match.away_goals is not None:
            score = f" Final score: {match.home_goals}-{match.away_goals}."
        events.append(
            MatchNotificationEvent(
                event_type="match_end",
                fingerprint=f"status:finished:{match.home_goals}-{match.away_goals}",
                title=title,
                body=f"Full time.{score}",
            )
        )

    return events


def _events_from_fixture_event(
    match: Match,
    event_payload: dict,
) -> list[MatchNotificationEvent]:
    title = _match_title(match)
    event_type = event_payload.get("type")
    detail = event_payload.get("detail") or ""
    time_info = event_payload.get("time") or {}
    elapsed = time_info.get("elapsed")
    extra = time_info.get("extra")
    minute = f"{elapsed}{f'+{extra}' if extra else ''}'"
    player = (event_payload.get("player") or {}).get("name") or "Unknown player"
    assist_name = (event_payload.get("assist") or {}).get("name")
    team_name = (event_payload.get("team") or {}).get("name") or "Team"
    fingerprint = (
        f"{event_type}:{detail}:{minute}:{player}:{team_name}:{assist_name or ''}"
    )

    events: list[MatchNotificationEvent] = []

    if event_type == "Goal":
        is_penalty = "Penalty" in detail
        if is_penalty:
            events.append(
                MatchNotificationEvent(
                    event_type="penalty",
                    fingerprint=fingerprint,
                    title=title,
                    body=f"Penalty goal! {player} ({team_name}) {minute}",
                )
            )
        events.append(
            MatchNotificationEvent(
                event_type="goal",
                fingerprint=fingerprint,
                title=title,
                body=f"Goal! {player} ({team_name}) {minute}",
            )
        )
        events.append(
            MatchNotificationEvent(
                event_type="goalscorer",
                fingerprint=f"scorer:{fingerprint}",
                title=title,
                body=f"{player} scored for {team_name} {minute}",
            )
        )
        if assist_name:
            events.append(
                MatchNotificationEvent(
                    event_type="assist",
                    fingerprint=f"assist:{fingerprint}",
                    title=title,
                    body=f"{assist_name} assisted {player} {minute}",
                )
            )
        return events

    if event_type == "Card":
        if "Red" in detail:
            events.append(
                MatchNotificationEvent(
                    event_type="red_card",
                    fingerprint=fingerprint,
                    title=title,
                    body=f"Red card for {player} ({team_name}) {minute}",
                )
            )
        elif "Yellow" in detail:
            events.append(
                MatchNotificationEvent(
                    event_type="yellow_card",
                    fingerprint=fingerprint,
                    title=title,
                    body=f"Yellow card for {player} ({team_name}) {minute}",
                )
            )
        return events

    if event_type == "Var":
        events.append(
            MatchNotificationEvent(
                event_type="var_decision",
                fingerprint=fingerprint,
                title=title,
                body=f"VAR decision: {detail} {minute}",
            )
        )

    return events


def dispatch_events_for_match(
    db: Session,
    match: Match,
    events: list[MatchNotificationEvent],
) -> NotificationDispatchSummary:
    summary = NotificationDispatchSummary(events_detected=len(events))
    if not events:
        return summary

    for event in events:
        if event.event_type not in MATCH_NOTIFICATION_KEYS:
            continue

        device_ids = get_enabled_devices_for_event(
            db,
            match_id=match.id,
            event_type=event.event_type,
        )
        if not device_ids:
            continue

        tokens = get_push_tokens_for_devices(db, device_ids)
        messages: list[PushMessage] = []

        for device_id in device_ids:
            if _already_sent(
                db,
                device_id=device_id,
                match_id=match.id,
                event_type=event.event_type,
                fingerprint=event.fingerprint,
            ):
                continue

            token = tokens.get(device_id)
            if not token:
                continue

            messages.append(
                PushMessage(
                    to=token,
                    title=event.title,
                    body=event.body,
                    data={
                        "matchId": str(match.id),
                        "eventType": event.event_type,
                    },
                )
            )
            _record_sent(
                db,
                device_id=device_id,
                match_id=match.id,
                event_type=event.event_type,
                fingerprint=event.fingerprint,
            )

        if messages:
            result = send_push_messages(messages)
            summary.messages_sent += result.sent
            summary.messages_failed += result.failed

    db.commit()
    return summary


def process_match_fixture_update(
    db: Session,
    match: Match,
    fixture_item: dict,
) -> NotificationDispatchSummary:
    fixture = fixture_item.get("fixture") or {}
    status_info = fixture.get("status") or {}
    short_status = status_info.get("short")
    goals = fixture_item.get("goals") or {}
    home_goals = goals.get("home")
    away_goals = goals.get("away")

    snapshot = _get_or_create_snapshot(db, match)
    previous_status = snapshot.status
    previous_short = snapshot.fixture_status_short

    from app.services.historical_import import map_fixture_status

    new_status = map_fixture_status(short_status or "NS")

    events = _events_from_status_transition(
        match,
        previous_status=previous_status,
        previous_short=previous_short,
        new_status=new_status,
        new_short=short_status,
    )

    snapshot.status = new_status
    snapshot.fixture_status_short = short_status
    if home_goals is not None:
        snapshot.home_goals = int(home_goals)
    if away_goals is not None:
        snapshot.away_goals = int(away_goals)

    summary = dispatch_events_for_match(db, match, events)
    db.commit()
    return summary


def process_live_match_events(
    db: Session,
    match: Match,
    client: FootballApiClient | None = None,
) -> NotificationDispatchSummary:
    if match.external_id is None:
        return NotificationDispatchSummary()

    api_client = client or FootballApiClient()
    summary = NotificationDispatchSummary()

    try:
        fixture_events = api_client.get_fixture_events(match.external_id)
    except (FootballApiError, Exception):
        logger.exception(
            "Failed to fetch fixture events for match %s", match.external_id
        )
        return summary

    detected: list[MatchNotificationEvent] = []
    for event_payload in fixture_events:
        detected.extend(_events_from_fixture_event(match, event_payload))

    summary.events_detected = len(detected)
    dispatch_summary = dispatch_events_for_match(db, match, detected)
    summary.messages_sent = dispatch_summary.messages_sent
    summary.messages_failed = dispatch_summary.messages_failed
    return summary


def process_lineups_confirmed(
    db: Session,
    match: Match,
    client: FootballApiClient | None = None,
) -> NotificationDispatchSummary:
    if match.external_id is None:
        return NotificationDispatchSummary()

    snapshot = _get_or_create_snapshot(db, match)
    if snapshot.lineups_confirmed:
        return NotificationDispatchSummary()

    api_client = client or FootballApiClient()
    try:
        lineups = api_client.get_fixture_lineups(match.external_id)
    except (FootballApiError, Exception):
        logger.exception("Failed to fetch lineups for match %s", match.external_id)
        return NotificationDispatchSummary()

    if len(lineups) < 2:
        return NotificationDispatchSummary()

    snapshot.lineups_confirmed = True
    event = MatchNotificationEvent(
        event_type="lineups_confirmed",
        fingerprint=f"lineups:{match.external_id}",
        title=_match_title(match),
        body="Starting line-ups are confirmed.",
    )
    db.commit()
    return dispatch_events_for_match(db, match, [event])


def _fetch_fixtures_by_ids(
    client: FootballApiClient,
    external_ids: list[int],
) -> dict[int, dict]:
    """Fetch specific fixtures by ID, keyed by external id.

    Gives the poll authoritative, up-to-the-minute status for the matches it is
    watching (kick-off, full time, half-time, etc.). Fetching only the relevant
    fixtures by ID — rather than the whole multi-day date window on every cycle —
    keeps each poll to roughly one provider call instead of one per synced day.
    """
    fixtures_by_id: dict[int, dict] = {}
    for start in range(0, len(external_ids), _MAX_FIXTURE_IDS_PER_REQUEST):
        chunk = external_ids[start : start + _MAX_FIXTURE_IDS_PER_REQUEST]
        try:
            fixtures = client.get_fixtures_by_ids(chunk)
        except (FootballApiError, httpx.HTTPError):
            logger.exception(
                "Failed to fetch fixtures %s during notification poll", chunk
            )
            continue
        for item in fixtures:
            try:
                external_id = int((item.get("fixture") or {}).get("id"))
            except (TypeError, ValueError):
                continue
            fixtures_by_id[external_id] = item

    return fixtures_by_id


def run_live_notification_sync(
    db: Session,
    client: FootballApiClient | None = None,
    now: datetime | None = None,
) -> NotificationDispatchSummary:
    """Poll matches near kickoff / in-play and dispatch push notifications.

    Only matches that are live, or scheduled within a short window around now,
    are polled. Line-up and full-time events only occur near kickoff, so there is
    no reason to hit the provider for every future fixture every cycle — doing so
    previously fetched line-ups for the entire upcoming slate on each poll and
    exhausted the API quota.
    """
    from app.services.historical_import import map_fixture_status

    api_client = client or FootballApiClient()
    total = NotificationDispatchSummary()

    resolved_now = now or datetime.now(UTC)
    if resolved_now.tzinfo is not None:
        resolved_now = resolved_now.astimezone(UTC).replace(tzinfo=None)
    lookahead_cutoff = resolved_now + timedelta(
        hours=settings.live_poll_lookahead_hours
    )
    lookback_cutoff = resolved_now - timedelta(hours=settings.live_poll_lookback_hours)

    matches = db.scalars(
        select(Match)
        .options(
            selectinload(Match.home_team),
            selectinload(Match.away_team),
        )
        .where(
            Match.status.in_(("scheduled", "live")),
            or_(
                Match.status == "live",
                and_(
                    Match.kickoff.is_not(None),
                    Match.kickoff >= lookback_cutoff,
                    Match.kickoff <= lookahead_cutoff,
                ),
            ),
        )
    ).all()

    if not matches:
        return total

    external_ids = [
        int(match.external_id) for match in matches if match.external_id is not None
    ]
    fixtures_by_ext = _fetch_fixtures_by_ids(api_client, external_ids)

    for match in matches:
        fixture_item = (
            fixtures_by_ext.get(match.external_id)
            if match.external_id is not None
            else None
        )

        current_status = match.status
        if fixture_item is not None:
            status_info = (fixture_item.get("fixture") or {}).get("status") or {}
            current_status = map_fixture_status(status_info.get("short") or "NS")
            transition = process_match_fixture_update(db, match, fixture_item)
            total.events_detected += transition.events_detected
            total.messages_sent += transition.messages_sent
            total.messages_failed += transition.messages_failed

        if current_status == "live":
            total.live_matches += 1
            result = process_live_match_events(db, match, api_client)
            total.events_detected += result.events_detected
            total.messages_sent += result.messages_sent
            total.messages_failed += result.messages_failed
        elif current_status == "scheduled":
            result = process_lineups_confirmed(db, match, api_client)
            total.events_detected += result.events_detected
            total.messages_sent += result.messages_sent
            total.messages_failed += result.messages_failed

    logger.info(
        "Live notification sync: %s events, %s sent, %s failed, %s live match(es)",
        total.events_detected,
        total.messages_sent,
        total.messages_failed,
        total.live_matches,
    )
    return total


def send_test_notification(
    db: Session,
    *,
    device_id: str,
    match_id: int,
    event_type: str,
) -> tuple[bool, int, str]:
    if event_type not in MATCH_NOTIFICATION_KEYS:
        raise ValueError(f"Unknown event type: {event_type}")

    match = db.scalar(
        select(Match)
        .options(
            selectinload(Match.home_team),
            selectinload(Match.away_team),
        )
        .where(Match.id == match_id)
    )
    if match is None:
        raise ValueError(f"Match {match_id} not found")

    tokens = get_push_tokens_for_devices(db, [device_id])
    token = tokens.get(device_id)
    if not token:
        raise ValueError(f"No push token registered for device {device_id}")

    label = EVENT_LABELS.get(event_type, event_type)
    title = _match_title(match)
    body = f"Test notification: {label}"
    fingerprint = f"test:{datetime.now(UTC).isoformat()}"

    message = PushMessage(
        to=token,
        title=title,
        body=body,
        data={
            "matchId": str(match.id),
            "eventType": event_type,
        },
    )
    result = send_push_messages([message])
    if result.sent == 0:
        detail = result.errors[0] if result.errors else "send failed"
        raise RuntimeError(detail)

    _record_sent(
        db,
        device_id=device_id,
        match_id=match_id,
        event_type=event_type,
        fingerprint=fingerprint,
    )
    db.commit()
    return True, 1, body
