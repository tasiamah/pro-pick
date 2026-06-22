# pro-pick — VoetbalAI

AI-driven football prediction app (iOS) that identifies **value bets**.

- **Backend** (`backend/`): Python + FastAPI + SQLAlchemy. Contains the data
  pipeline, the ML prediction model and the value-bet engine. Serves everything
  to the app as JSON.
- **Mobile** (`mobile/`): React Native (Expo) + TypeScript. Shows the dashboard,
  match overview, favorites and analytics.

> **Disclaimer:** This app is intended solely for AI analysis and entertainment.
> It is not a gambling or betting service and does not provide guaranteed
> outcomes.

## Architecture

```
┌─────────────────┐   HTTPS   ┌──────────────────┐        ┌─────────────────┐
│   iOS App        │──────────▶│   Backend API     │───────▶│  Football data + │
│ (React Native)   │◀──────────│   (FastAPI)       │        │  odds API (ext.)  │
└─────────────────┘    JSON    │  + ML model       │        └─────────────────┘
                                │  + value bets     │        ┌─────────────────┐
                                │  + database       │───────▶│  PostgreSQL      │
                                └──────────────────┘        └─────────────────┘
```

The ML model and the value-bet calculation run on the **backend**, not on the
phone. The app only displays results.

## Quick start

### Backend
```bash
cd backend
python3.11 -m venv .venv   # the project runs on Python 3.11
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```
Open http://localhost:8000/docs for the interactive API documentation and
http://localhost:8000/health for the health check.

By default the backend runs on **SQLite** (zero configuration). For PostgreSQL,
set `DATABASE_URL` in `.env` or use `docker compose up` (see
`backend/docker-compose.yml`).

### Mobile
```bash
cd mobile
npm install
npm run ios
```

## Project structure
```
pro-pick/
├── backend/          # FastAPI + ML + value bets
├── mobile/           # React Native (Expo) app
└── docs/             # Jira backlog, planning
```

## CI / Pipeline

Every push to `main` and every pull request runs the GitHub Actions pipeline
(`.github/workflows/ci.yml`) with three sequential stages for the backend:

1. **Lint** — `ruff check` + `ruff format --check`.
2. **Unit tests** — `pytest -m unit` (fast, isolated).
3. **Integration tests** — `pytest -m integration` against a real PostgreSQL
   service (app + database together).

The stages are chained (`lint → unit → integration`): if an earlier stage fails,
the later ones do not run. There is also a **mobile** job that automatically
lints/tests once the Expo app exists (`mobile/package.json`, ticket PP-43).

Reproduce the pipeline locally:

```bash
cd backend
pip install -r requirements-dev.txt
ruff check . && ruff format --check .   # stage 1
pytest -m unit                          # stage 2
pytest -m integration                   # stage 3 (SQLite locally, Postgres in CI)
```

## Collaboration (branches & PRs)

- Work on feature branches (e.g. `feature/PP-42-...`) and open a **pull
  request**; pushing directly to `main` is blocked locally by the git hook.
- Enable the shared git hooks once after cloning:

  ```bash
  ./.githooks/setup.sh
  ```

- A PR can only be merged once the CI pipeline (lint + tests) is green.
- **Changelog required:** update `CHANGELOG.md` in every PR with a line under
  `## [Unreleased]`. Otherwise the `Changelog` check fails. For PRs without a
  user-facing change (e.g. CI tweaks) you can add the `skip-changelog` label to
  the PR to skip the check.

## Roadmap & planning
See `docs/JIRA_BACKLOG.md` for the full epics/tickets and the 7-working-day
sprint plan.
