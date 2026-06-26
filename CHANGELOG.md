# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

> **Workflow:** every PR should add a line under **[Unreleased]** in the right
> category (`Added`, `Changed`, `Fixed`, `Removed`). CI checks for this.
> On a release, move the contents of **[Unreleased]** into a new versioned
> heading with a date.

## [Unreleased]

### Added
- Historical data import service and CLI to load 2–3 seasons of fixtures,
  final scores, and 1X2 odds for the top five European leagues into the
  database (`historical_import.py`, `python -m app.scripts.import_historical`,
  PP-49).
- API-Football client for fixtures and odds with retries, rate limiting, and
  mocked unit tests in `data_ingestion.py` (PP-48).
- Data provider decision document comparing API-Football, Sportmonks, and Opta
  with cost plan for MVP (`docs/DATA_PROVIDER.md`, PP-34).
- Production secret validation for `DATABASE_URL` and `FOOTBALL_API_KEY` on API
  startup; configuration and secrets guide in `backend/README.md` (PP-45).
- Monorepo structure (`backend/` + `mobile/`).
- FastAPI skeleton with health, dashboard, matches, predictions, value-bets
  and analytics endpoints.
- Alembic database migrations with initial schema (competitions, teams,
  matches, odds, predictions, value bets).
- Docker Compose setup for local PostgreSQL + API with automatic migrations.
- Supabase managed PostgreSQL setup guide in `backend/README.md` and
  `.env.example` (Session pooler, secrets in `.env` only).
- CI pipeline (GitHub Actions) with three stages: lint, unit tests and
  integration tests against PostgreSQL.
- Ruff configuration for linting and formatting; pytest split into
  `tests/unit/` and `tests/integration/` with markers.
- Changelog enforcement: PRs must update `CHANGELOG.md` (or carry the
  `skip-changelog` label).
- Expo + React Native + TypeScript app in `mobile/` with bottom-tab navigation
  skeleton (Dashboard, Matches, Favorites, Analytics); ESLint and typecheck
  scripts for CI.
- Mobile navigation: Home / Matches / Favorites stacks with match detail routes,
  dark tab bar with icons aligned to the Pro Pick demo (PP-76).
- Mobile API client with TypeScript types and TanStack Query hooks for all
  backend endpoints (`/dashboard`, `/matches`, `/predictions`, `/value-bets`,
  `/analytics`).
- Central mobile theme: semantic demo colors, typography, spacing, and radii
  tokens with shared screen styles (PP-77).
- Reusable mobile components: `MatchCard`, `ValueBetCard`, and shared
  loading/empty/error state views for upcoming screen tickets (PP-78).
- Home tab dashboard: date picker, stat summary from `/dashboard`, filtered
  match cards, top value bets, and pull-to-refresh (PP-79).
- Matches tab overview: upcoming matches with 1X2 prediction and odds,
  shared date picker, and pull-to-refresh (PP-80).
- Match detail screen: prediction probabilities, odds by bookmaker, and
  value bets for a selected match via `/matches/{id}` (PP-81).
- Favorites tab: persist favorite teams and competitions with Zustand and
  AsyncStorage, favorite toggles on match cards, and filtered match overview
  (PP-82).
- Analytics tab: accuracy and ROI summary cards with ROI trend chart via
  `react-native-gifted-charts` (PP-83).
- Persistent entertainment disclaimer banner on all mobile screens (PP-84).
- Integration tests for `GET /matches/{id}` covering the detail response
  (prediction and odds) and the not-found case (PP-68).
- API integration tests covering request validation (invalid pagination and
  query parameters), pagination limits, and empty-state responses across the
  matches, value-bets, predictions, analytics, and dashboard endpoints (PP-74).

### Changed
- Mobile Home and Matches screens anchor the date picker on the latest imported
  kickoff when no upcoming fixtures exist, so historical data is visible
  (PP-49).
- Default historical import seasons set to 2022–2024 for API-Football free tier
  (PP-49).
- Mobile screens use shared query-state helpers so loading, empty, and error
  views stay consistent and keep cached data visible during refetch failures
  (PP-85).

- `GET /matches` now returns upcoming matches with embedded prediction and odds
  for list screens (PP-80).
- `GET /value-bets` accepts optional `match_id` query parameter for
  match-scoped value bet lists (PP-81).
- `GET /predictions` now includes `match_id` per prediction and accepts an
  optional `match_id` filter for match-scoped prediction lists (PP-69).
- `/health` and `/` now return typed Pydantic responses (`HealthOut`,
  `ServiceInfoOut`) so every endpoint is fully described in the auto-generated
  OpenAPI schema (PP-66).
- `GET /analytics` now computes accuracy, ROI, and cumulative daily ROI trend
  from settled value bets and finished matches (PP-83).
- `GET /analytics` now reports model `log_loss` over finished matches with
  predictions (PP-71).
- `GET /dashboard` now scopes `top_value_bets` to matches kicking off today and
  reports `model_accuracy` and `roi` from the shared analytics computation
  (PP-72).
- Mobile screens and navigation now consume shared theme tokens instead of
  hardcoded values (PP-77).
- Mobile tab label **Dashboard** renamed to **Home** (PP-76).
- Standardized on Python 3.11 (CI, Docker, `pyproject.toml`,
  `.python-version`).
- Backend startup uses Alembic migrations instead of `create_all` at runtime.
- Docker Compose database credentials parameterized via environment variables.
- `.env.example` uses explicit localhost CORS origins instead of a wildcard.
- Remaining Dutch comment in `alembic/env.py` translated to English.

### Fixed
- `GET /dashboard` now returns `latest_kickoff` so clients can browse imported
  historical match weeks (PP-49).
- `mobile/LICENSE` copyright updated from Expo template text to Pro Pick.

[Unreleased]: https://github.com/tasiamah/pro-pick/commits/main
