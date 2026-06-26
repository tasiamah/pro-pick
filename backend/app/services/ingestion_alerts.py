"""Structured alerts for data pipeline ingestion failures."""

from __future__ import annotations

import logging

alert_logger = logging.getLogger("pro_pick.ingestion")


class IngestionPipelineError(Exception):
    """Raised when ingestion cannot complete due to a pipeline failure."""


def alert_ingestion_failure(
    *,
    source: str,
    message: str,
    exc_info: BaseException | bool | None = None,
) -> None:
    alert_logger.error(
        "Ingestion failure [%s]: %s",
        source,
        message,
        exc_info=exc_info if exc_info is not None else False,
    )
