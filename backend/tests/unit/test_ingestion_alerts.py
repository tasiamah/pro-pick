from __future__ import annotations

import logging

import pytest

from app.services.ingestion_alerts import (
    IngestionPipelineError,
    alert_ingestion_failure,
)

pytestmark = pytest.mark.unit


def test_alert_ingestion_failure_logs_structured_error(
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.ERROR, logger="pro_pick.ingestion")

    alert_ingestion_failure(
        source="test.source",
        message="Provider unavailable",
    )

    assert len(caplog.records) == 1
    record = caplog.records[0]
    assert record.levelno == logging.ERROR
    assert record.name == "pro_pick.ingestion"
    assert "Ingestion failure [test.source]: Provider unavailable" in record.message


def test_alert_ingestion_failure_includes_exception_context(
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.ERROR, logger="pro_pick.ingestion")
    error = IngestionPipelineError("All fixture date fetches failed")

    alert_ingestion_failure(
        source="test.source",
        message=str(error),
        exc_info=error,
    )

    assert len(caplog.records) == 1
    assert caplog.records[0].exc_info is not None
