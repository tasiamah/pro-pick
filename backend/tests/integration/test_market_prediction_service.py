"""Integration tests: multi-market prediction service."""

from __future__ import annotations

from datetime import datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.ml.binary_model import train_binary_model
from app.ml.market_labels import (
    BTTS_NO,
    BTTS_YES,
    MARKET_BTTS,
    build_market_training_dataset,
)
from app.ml.storage import ModelBundle, ModelMetadata
from app.models import Competition, MarketPrediction, Match, Team
from app.services.market_prediction import (
    FALLBACK_VERSION,
    predict_market,
    refresh_market_predictions_for_recent_finished,
    refresh_market_predictions_for_upcoming,
    reset_market_model_cache,
)

pytestmark = pytest.mark.integration

BASE = datetime(2024, 3, 1, 15, 0)
RESULTS = [
    (0, 1, 2, 0),
    (1, 2, 0, 2),
    (2, 3, 1, 1),
    (3, 0, 3, 1),
    (0, 2, 0, 0),
    (1, 3, 1, 2),
]


@pytest.fixture
def db_session() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _seed(db: Session) -> Match:
    competition = Competition(name="Market League", country="Testland", season="2024")
    teams = [Team(name=f"Team {index}", logo_url=None) for index in range(4)]
    db.add_all([competition, *teams])
    db.flush()

    db.add_all(
        Match(
            competition_id=competition.id,
            home_team_id=teams[home].id,
            away_team_id=teams[away].id,
            kickoff=BASE + timedelta(days=index),
            status="finished",
            home_goals=home_goals,
            away_goals=away_goals,
        )
        for index, (home, away, home_goals, away_goals) in enumerate(RESULTS)
    )
    upcoming = Match(
        competition_id=competition.id,
        home_team_id=teams[0].id,
        away_team_id=teams[1].id,
        kickoff=BASE + timedelta(days=30),
        status="scheduled",
    )
    db.add(upcoming)
    db.commit()
    return upcoming


def _btts_bundle(db: Session) -> ModelBundle:
    dataset = build_market_training_dataset(db, MARKET_BTTS)
    model = train_binary_model(dataset)
    return ModelBundle(
        model=model,
        metadata=ModelMetadata(
            version="test-btts",
            algorithm="logistic",
            trained_at="2024-03-01T12:00:00+00:00",
            n_samples=len(dataset.features),
            feature_columns=[],
            metrics={"accuracy": 0.5, "log_loss": 1.0},
        ),
    )


def test_predict_market_uses_model_bundle(db_session: Session) -> None:
    upcoming = _seed(db_session)
    bundle = _btts_bundle(db_session)

    result = predict_market(db_session, upcoming, MARKET_BTTS, model_bundle=bundle)

    assert result.model_version == "test-btts"
    assert set(result.probabilities) == {BTTS_YES, BTTS_NO}
    assert round(sum(result.probabilities.values()), 6) == 1.0


def test_refresh_market_predictions_persists_rows(db_session: Session) -> None:
    upcoming = _seed(db_session)
    bundle = _btts_bundle(db_session)

    refreshed = refresh_market_predictions_for_upcoming(
        db_session,
        now=BASE,
        model_bundles={MARKET_BTTS: bundle},
    )

    assert refreshed == 1
    stored = db_session.scalars(
        select(MarketPrediction).where(MarketPrediction.match_id == upcoming.id)
    ).all()
    assert len(stored) == 1
    assert stored[0].market == MARKET_BTTS


def test_backfill_market_predictions_for_recent_finished(db_session: Session) -> None:
    _seed(db_session)
    bundle = _btts_bundle(db_session)

    refreshed = refresh_market_predictions_for_recent_finished(
        db_session,
        now=BASE + timedelta(days=6),
        model_bundles={MARKET_BTTS: bundle},
        window_days=14,
    )

    # Each of the six finished matches in the window gets one BTTS row; the
    # scheduled match is skipped (not finished).
    assert refreshed == len(RESULTS)
    finished = db_session.scalars(select(Match).where(Match.status == "finished")).all()
    for match in finished:
        stored = db_session.scalars(
            select(MarketPrediction).where(MarketPrediction.match_id == match.id)
        ).all()
        assert [row.market for row in stored] == [MARKET_BTTS]


def test_backfill_market_predictions_is_noop_once_present(db_session: Session) -> None:
    _seed(db_session)
    bundle = _btts_bundle(db_session)
    kwargs = {
        "now": BASE + timedelta(days=6),
        "model_bundles": {MARKET_BTTS: bundle},
        "window_days": 14,
    }

    first = refresh_market_predictions_for_recent_finished(db_session, **kwargs)
    second = refresh_market_predictions_for_recent_finished(db_session, **kwargs)

    assert first == len(RESULTS)
    assert second == 0


def test_backfill_market_predictions_respects_window(db_session: Session) -> None:
    _seed(db_session)
    bundle = _btts_bundle(db_session)

    # since = now - 2d = BASE+4, so only the matches at BASE+4 and BASE+5 qualify.
    refreshed = refresh_market_predictions_for_recent_finished(
        db_session,
        now=BASE + timedelta(days=6),
        model_bundles={MARKET_BTTS: bundle},
        window_days=2,
    )

    assert refreshed == 2


def test_backfill_market_predictions_respects_max_matches(db_session: Session) -> None:
    _seed(db_session)
    bundle = _btts_bundle(db_session)

    refreshed = refresh_market_predictions_for_recent_finished(
        db_session,
        now=BASE + timedelta(days=6),
        model_bundles={MARKET_BTTS: bundle},
        window_days=14,
        max_matches=2,
    )

    assert refreshed == 2


def test_backfill_market_predictions_isolates_failing_match(
    db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _seed(db_session)
    bundle = _btts_bundle(db_session)
    poison_id = (
        db_session.scalars(
            select(Match).where(Match.status == "finished").order_by(Match.kickoff)
        )
        .first()
        .id
    )

    import app.services.market_prediction as mp

    original = mp.predict_market

    def flaky(db, match, market, *, model_bundle=None):
        if match.id == poison_id:
            raise ValueError("boom")
        return original(db, match, market, model_bundle=model_bundle)

    monkeypatch.setattr(mp, "predict_market", flaky)

    refreshed = refresh_market_predictions_for_recent_finished(
        db_session,
        now=BASE + timedelta(days=6),
        model_bundles={MARKET_BTTS: bundle},
        window_days=14,
    )

    # The one failing match is skipped; every other match is still committed.
    assert refreshed == len(RESULTS) - 1
    assert (
        db_session.scalars(
            select(MarketPrediction).where(MarketPrediction.match_id == poison_id)
        ).all()
        == []
    )
    assert len(db_session.scalars(select(MarketPrediction)).all()) == len(RESULTS) - 1


def test_predict_market_falls_back_without_model(db_session: Session) -> None:
    upcoming = _seed(db_session)
    reset_market_model_cache()

    result = predict_market(db_session, upcoming, MARKET_BTTS, model_bundle=None)

    assert result.model_version == FALLBACK_VERSION
    assert result.probabilities[BTTS_YES] == 0.5
    assert result.probabilities[BTTS_NO] == 0.5
