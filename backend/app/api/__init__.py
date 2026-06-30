from fastapi import APIRouter

from app.api import (
    analytics,
    dashboard,
    health,
    matches,
    notifications,
    predictions,
    value_bets,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(matches.router, prefix="/matches", tags=["matches"])
api_router.include_router(
    predictions.router, prefix="/predictions", tags=["predictions"]
)
api_router.include_router(value_bets.router, prefix="/value-bets", tags=["value-bets"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(
    notifications.router, prefix="/notifications", tags=["notifications"]
)
