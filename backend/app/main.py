from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.core.config import settings
from app.scheduler.jobs import start_scheduler, stop_scheduler
from app.schemas.common import ServiceInfoOut


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.validate_for_runtime()
    # Scheduler runs in-process; PostgreSQL advisory lock ensures one worker syncs.
    start_scheduler()
    try:
        yield
    finally:
        stop_scheduler()


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description=(
        "AI analysis for football matches. For entertainment only; "
        "not a gambling or betting service."
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


@app.get("/", response_model=ServiceInfoOut)
def root() -> ServiceInfoOut:
    return ServiceInfoOut(app=settings.app_name, docs="/docs", health="/health")
