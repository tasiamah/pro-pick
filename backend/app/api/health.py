from __future__ import annotations

from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()


@router.get("/health")
def health() -> dict:
    """Eenvoudige healthcheck voor monitoring en deploys."""
    return {"status": "ok", "app": settings.app_name, "env": settings.environment}
