from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models import Match
from app.schemas.notifications import (
    MatchNotificationSettingsIn,
    MatchNotificationSettingsOut,
    PushTokenRegisterIn,
    PushTokenRegisterOut,
    TestNotificationIn,
    TestNotificationOut,
)
from app.services.match_notification_events import send_test_notification
from app.services.notification_preferences import (
    get_match_notification_settings,
    save_match_notification_settings,
)
from app.services.notification_keys import MATCH_NOTIFICATION_KEYS
from app.services.push_token_registry import register_push_token

router = APIRouter()


@router.post("/register", response_model=PushTokenRegisterOut)
def register_device_push_token(
    payload: PushTokenRegisterIn,
    db: Session = Depends(get_db),
) -> PushTokenRegisterOut:
    register_push_token(
        db,
        device_id=payload.device_id.strip(),
        expo_push_token=payload.expo_push_token.strip(),
        platform=payload.platform.strip().lower(),
    )
    return PushTokenRegisterOut(device_id=payload.device_id, registered=True)


@router.get("/preferences", response_model=MatchNotificationSettingsOut)
def fetch_notification_preferences(
    device_id: str = Query(min_length=8, max_length=64),
    match_id: int = Query(gt=0),
    db: Session = Depends(get_db),
) -> MatchNotificationSettingsOut:
    match = db.get(Match, match_id)
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")

    settings_map = get_match_notification_settings(
        db,
        device_id=device_id.strip(),
        match_id=match_id,
    )
    return MatchNotificationSettingsOut(match_id=match_id, settings=settings_map)


@router.put("/preferences", response_model=MatchNotificationSettingsOut)
def update_notification_preferences(
    payload: MatchNotificationSettingsIn,
    db: Session = Depends(get_db),
) -> MatchNotificationSettingsOut:
    match = db.get(Match, payload.match_id)
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")

    try:
        settings_map = save_match_notification_settings(
            db,
            device_id=payload.device_id.strip(),
            match_id=payload.match_id,
            settings=payload.settings,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return MatchNotificationSettingsOut(
        match_id=payload.match_id,
        settings=settings_map,
    )


@router.post("/test", response_model=TestNotificationOut)
def send_test_push_notification(
    payload: TestNotificationIn,
    db: Session = Depends(get_db),
) -> TestNotificationOut:
    if payload.event_type not in MATCH_NOTIFICATION_KEYS:
        raise HTTPException(status_code=422, detail="Unknown event type")

    secret = settings.notification_test_secret.strip()
    if secret:
        if payload.secret != secret:
            raise HTTPException(status_code=403, detail="Invalid test secret")
    elif settings.is_production:
        raise HTTPException(
            status_code=403,
            detail="Set NOTIFICATION_TEST_SECRET to use the test endpoint in production",
        )

    try:
        _, recipients, message = send_test_notification(
            db,
            device_id=payload.device_id.strip(),
            match_id=payload.match_id,
            event_type=payload.event_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return TestNotificationOut(sent=True, recipients=recipients, message=message)
