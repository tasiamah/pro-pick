# VoetbalAI — Backend

FastAPI backend with data pipeline, ML prediction model and value-bet engine.

## Getting started (local, SQLite — zero configuration)

```bash
python3.11 -m venv .venv   # the project runs on Python 3.11
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

- API docs (Swagger): http://localhost:8000/docs
- Health check: http://localhost:8000/health

## PostgreSQL + Alembic (Docker Compose)

```bash
docker compose up --build
```

Starts PostgreSQL and the API. Runs `alembic upgrade head` automatically before the
server starts.

Or set `DATABASE_URL` in `.env` and run migrations manually:

```
DATABASE_URL=postgresql+psycopg2://voetbalai:voetbalai@localhost:5432/voetbalai
alembic upgrade head
```

## Database migrations (Alembic)

```bash
# Apply pending migrations
alembic upgrade head

# Generate a new migration after model changes
alembic revision --autogenerate -m "description"

# Roll back one migration
alembic downgrade -1
```

## Linting & formatting

```bash
pip install -r requirements-dev.txt
ruff check .          # lint
ruff format .         # auto-format
ruff format --check . # check without modifying (as in CI)
```

## Tests

Tests are split into **unit** (`tests/unit/`, fast and isolated) and
**integration** (`tests/integration/`, app + database together).

```bash
pytest                 # everything
pytest -m unit         # unit tests only
pytest -m integration  # integration tests only (uses DATABASE_URL, else SQLite)
```

In CI the integration tests run against a real PostgreSQL service via
`DATABASE_URL`. Locally they fall back to SQLite, so `pytest` works without extra
setup.

## Structure

```
app/
├── main.py            # FastAPI entrypoint
├── core/              # config + database
├── api/               # endpoints (health, matches, predictions, value_bets, analytics, dashboard)
├── models/            # SQLAlchemy models
├── schemas/           # Pydantic request/response models
├── services/          # data_ingestion, prediction, value_bets
├── ml/                # features, train, model.pkl
└── scheduler/         # scheduled jobs (daily update)
alembic/               # database migrations
```

## Endpoints (v1)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/dashboard` | Summary overview |
| GET | `/matches` | Match overview |
| GET | `/matches/{id}` | Match detail |
| GET | `/predictions` | Predictions |
| GET | `/value-bets` | Value bets |
| GET | `/analytics` | Model performance & ROI |

> The data ingestion, the ML model and the scheduler are set up as stubs and
> will be filled in on Day 2-3.
