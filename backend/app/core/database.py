from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    """Base class for all ORM models."""


def _build_engine():
    database_url = settings.database_url

    if database_url.startswith("sqlite"):
        return create_engine(
            database_url,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
        )

    pool_kwargs: dict[str, object] = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }

    # Supabase session pooler enforces a small connection cap per client.
    if "pooler.supabase.com" in database_url:
        pool_kwargs["pool_size"] = 1
        pool_kwargs["max_overflow"] = 0
    else:
        pool_kwargs["pool_size"] = 3
        pool_kwargs["max_overflow"] = 2

    return create_engine(database_url, **pool_kwargs)


engine = _build_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that provides a DB session and closes it cleanly."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create tables based on the models.

    For local tests only. In dev/production use: `alembic upgrade head`.
    """
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
