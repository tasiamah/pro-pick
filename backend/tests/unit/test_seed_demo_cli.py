from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.scripts.seed_demo import main

pytestmark = pytest.mark.unit


@patch("app.scripts.seed_demo.run_demo_seed")
@patch("app.scripts.seed_demo.SessionLocal")
def test_main_prints_summary(
    mock_session_local: MagicMock,
    mock_run_demo_seed: MagicMock,
    capsys: pytest.CaptureFixture[str],
) -> None:
    mock_db = MagicMock()
    mock_session_local.return_value = mock_db
    mock_run_demo_seed.return_value = MagicMock(
        matches=12,
        predictions=2,
        odds=2,
        value_bets=2,
    )

    exit_code = main([])

    assert exit_code == 0
    captured = capsys.readouterr()
    assert "Demo seed complete" in captured.out
    assert "12 matches" in captured.out
    mock_db.close.assert_called_once()


@patch("app.scripts.seed_demo.purge_demo_seed")
@patch("app.scripts.seed_demo.SessionLocal")
def test_main_purges_when_flag_set(
    mock_session_local: MagicMock,
    mock_purge_demo_seed: MagicMock,
    capsys: pytest.CaptureFixture[str],
) -> None:
    mock_db = MagicMock()
    mock_session_local.return_value = mock_db
    mock_purge_demo_seed.return_value = MagicMock(
        matches=12,
        predictions=2,
        odds=2,
        value_bets=2,
    )

    exit_code = main(["--purge"])

    assert exit_code == 0
    captured = capsys.readouterr()
    assert "Demo purge complete: removed" in captured.out
    assert "12 matches" in captured.out
    mock_purge_demo_seed.assert_called_once_with(mock_db)
    mock_db.close.assert_called_once()
