from __future__ import annotations

from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()


@router.get("/health")
def health() -> dict:
    """Simple health check for monitoring and deploys."""
    return {"status": "ok", "app": settings.app_name, "env": settings.environment}
