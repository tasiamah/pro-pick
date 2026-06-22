from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    """Basisklasse voor alle ORM-modellen."""


# SQLite heeft een speciale connect-arg nodig voor multi-threaded gebruik.
_connect_args = (
    {"check_same_thread": False}
    if settings.database_url.startswith("sqlite")
    else {}
)

engine = create_engine(
    settings.database_url,
    connect_args=_connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI-dependency die een DB-sessie levert en netjes afsluit."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Maak tabellen aan op basis van de modellen.

    Alleen bedoeld voor lokale tests. Gebruik in dev/productie:
    `alembic upgrade head`.
    """
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
