from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.core.config import settings
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Database-schema wordt beheerd via Alembic-migraties (zie backend/README.md).
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description=(
        "AI-analyse voor voetbalwedstrijden. Uitsluitend voor entertainment; "
        "geen gok- of weddenschapsdienst."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/")
def root() -> dict:
    return {"app": settings.app_name, "docs": "/docs", "health": "/health"}
