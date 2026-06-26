# VoetbalAI — Backend

FastAPI backend with data pipeline, ML prediction model, and value-bet engine.

## Quick start (local, SQLite)

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

## Managed PostgreSQL (Supabase)

Use Supabase for a production-ready database. Store the connection string in `.env` only — never commit it to git.

### 1. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Save the **database password** when prompted (Supabase will not show it again).

### 2. Get the connection string

1. Open **Connect** in the Supabase dashboard.
2. Select **Session pooler** (recommended on IPv4 networks; Direct connection may fail on some networks).
3. Copy the **URI** connection string.

### 3. Configure `.env`

```bash
cp .env.example .env
```

Set `DATABASE_URL` in `.env`:

```env
DATABASE_URL=postgresql+psycopg2://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@[POOLER-HOST]:5432/postgres
```

Replace:

- `[PROJECT-REF]` — your Supabase project reference (from the URI)
- `[YOUR-PASSWORD]` — your database password
- `[POOLER-HOST]` — pooler hostname from the Supabase dashboard (e.g. `aws-1-eu-central-1.pooler.supabase.com`)

**Important:** add `+psycopg2` after `postgresql` (required for SQLAlchemy).

### 4. Run migrations

```bash
alembic upgrade head
```

Verify in Supabase → **Database → Tables**: you should see `competitions`, `matches`, `teams`, `odds`, `predictions`, `value_bets`, and `alembic_version`.

### 5. Start the API

```bash
uvicorn app.main:app --reload
```

Set production secrets in the host environment dashboard — not in source code.
See [Configuration & secrets](#configuration--secrets).

## Configuration & secrets

API keys and database credentials are loaded from environment variables. Never commit
them to git. Local development uses `backend/.env` (gitignored). Production uses the
host environment (for example Render or Railway).

### Secret variables

| Variable | Local | Production | Notes |
|----------|-------|------------|-------|
| `DATABASE_URL` | Optional (defaults to SQLite) | Required | Supabase PostgreSQL URI with `+psycopg2` |
| `FOOTBALL_API_KEY` | Optional | Required | Football / odds provider API key |

Copy the template and fill in values locally:

```bash
cp .env.example .env
```

Other settings (`APP_NAME`, `ENVIRONMENT`, `CORS_ORIGINS`, value-bet thresholds) are
documented in `.env.example`. Only `DATABASE_URL` and `FOOTBALL_API_KEY` are treated
as secrets.

When `ENVIRONMENT=production`, the API validates on startup and refuses to boot if
`DATABASE_URL` uses SQLite or `FOOTBALL_API_KEY` is missing.

If a password or API key was exposed, rotate it in Supabase or your provider dashboard,
then update `.env` or the host environment.

## Data provider

Pro Pick uses **API-Football (API-Sports)** for fixtures and pre-match odds.
See [docs/DATA_PROVIDER.md](../docs/DATA_PROVIDER.md) for the PP-34 comparison
of API-Football, Sportmonks, and Opta, plus cost estimates.

Configure `FOOTBALL_API_BASE_URL` and `FOOTBALL_API_KEY` in `.env` (see
`.env.example`). The HTTP client lives in `app/services/data_ingestion.py`.

## Historical data import (PP-49)

After migrations and a valid `FOOTBALL_API_KEY`, load historical fixtures,
final scores, and 1X2 odds into the database:

```bash
cd backend
source .venv/bin/activate
python -m app.scripts.import_historical
```

By default this imports three seasons (2022–2024) for the top five European
leagues (Premier League, La Liga, Serie A, Bundesliga, Ligue 1). Override
leagues or seasons:

```bash
python -m app.scripts.import_historical --league 39 --season 2024
python -m app.scripts.import_historical --skip-odds
```

Odds are fetched per match and can exceed the API-Football free tier (100
requests/day). Use `--skip-odds` for fixture-only runs during development, or
upgrade to a paid plan for a full import. See
[docs/DATA_PROVIDER.md](../docs/DATA_PROVIDER.md).

## Daily scheduler (PP-50)

When the API starts, an optional APScheduler job can sync the current season
for the top five European leagues. It reuses the historical import service to
upsert fixtures and 1X2 odds, logs per-league progress, and continues when a
single league fails.

The scheduler is **disabled by default** in local development. Enable it in
`.env`:

```env
SCHEDULER_ENABLED=true
SCHEDULER_DAILY_HOUR=6
SCHEDULER_IMPORT_ODDS=true
```

Set `SCHEDULER_IMPORT_ODDS=false` to sync fixtures only and reduce API usage.
The job runs at the configured UTC hour while the API process is running.

## PostgreSQL + Alembic (Docker Compose)

```bash
docker compose up --build
```

Starts PostgreSQL and the API. Runs `alembic upgrade head` automatically before the server starts.

Or set `DATABASE_URL` in `.env` and run migrations manually:

```env
DATABASE_URL=postgresql+psycopg2://voetbalai:voetbalai@localhost:5432/voetbalai
```

```bash
alembic upgrade head
```

## Database migrations (Alembic)

```bash
# Apply all pending migrations
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

## Project structure

```text
app/
├── main.py            # FastAPI entrypoint
├── core/              # config + database
├── api/               # endpoints (health, matches, predictions, value_bets, analytics, dashboard)
├── models/            # SQLAlchemy models
├── schemas/           # Pydantic request/response models
├── services/          # data_ingestion, historical_import, daily_import, prediction, value_bets
├── scripts/           # CLI tools (historical import)
├── ml/                # features, train, model.pkl
└── scheduler/         # scheduled jobs (daily update)
alembic/               # database migrations
```

## Endpoints (v1)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/dashboard` | Summary overview |
| GET | `/matches` | Match list |
| GET | `/matches/{id}` | Match detail |
| GET | `/predictions` | Predictions |
| GET | `/value-bets` | Value bets |
| GET | `/analytics` | Model performance & ROI |

> ML model training is stubbed and will be implemented in later tickets.
