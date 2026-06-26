from __future__ import annotations

from fastapi import APIRouter

from app.core.config import settings
from app.schemas.common import HealthOut

router = APIRouter()


@router.get("/health", response_model=HealthOut)
def health() -> HealthOut:
    """Simple health check for monitoring and deploys."""
    return HealthOut(status="ok", app=settings.app_name, env=settings.environment)
