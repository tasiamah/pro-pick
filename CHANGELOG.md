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
- Idempotent demo seed script for local development with Bournemouth vs Luton
  fixtures, team form history, predictions, odds, and value bets
  (`python -m app.scripts.seed_demo`, PP-108).
- Enriched match API for demo parity: team form, prediction confidence,
  recommended outcome, insights, odds movement fields, and list filters for
  `status`, `odds_tier`, and `q` on `GET /matches` and `GET /matches/{id}`
  (PP-107).
- TestFlight release readiness for the mobile app: a stable iOS identity in
  `app.json` (display name "ProPick", `bundleIdentifier` `com.propick.app`) and
  a documented EAS build, submit, and beta-test/feedback runbook
  (`mobile/README.md`, PP-94).
- Value-bet settlement for ROI tracking: once a match finishes, open value bets
  are scored against the result and their realized profit (fractional-Kelly
  stake) is recorded, so `/analytics` reports ROI and its trend over time
  (PP-64).
- Value bets recomputed after each scheduled retraining run: once the
  `retrain_model` job refreshes upcoming predictions it now recomputes their
  value bets, keeping them in sync with the active model
  (`app/scheduler/jobs.py`, PP-65).
- Value-bet confidence score derived from model certainty: the margin between
  the chosen outcome's probability and the next most likely outcome, surfaced
  per value bet (PP-62).
- Value-bet persistence: a reusable `generate_value_bets` service that stores
  expected value, edge, recommended stake, and confidence per upcoming match,
  replacing unsettled bets while preserving settled ones; the live sync now
  delegates to it (`app/services/value_bets.py`, PP-63).
- Mobile production API wiring: `mobile/eas.json` build profiles
  (development/preview/production) that inject `EXPO_PUBLIC_API_URL`, plus a
  `.env.example` default pointing the app at the deployed backend
  (`https://pro-pick.onrender.com`).
- API hardening: consistent JSON error responses, `Cache-Control` headers on the
  heavy `/analytics` and `/dashboard` endpoints, and per-client rate limiting
  with configurable limits (PP-73).
- Value-bet engine: per-market (home/draw/away) expected value and edge
  (model probability minus the implied probability `1/odd`), flagged as a value
  bet when the edge clears the configurable `value_bet_edge_threshold`
  (`app/services/value_bets.py`, PP-60).
- Recommended stake via fractional Kelly: full Kelly bounded to [0, 1] scaled by
  the configurable `kelly_fraction` multiplier, persisted per value bet
  (`app/services/value_bets.py`, PP-61).
- Shared demo UI component library for Epic 9: search, filters, form dots,
  badges, charts, odds cards, alert banner, edge bar, and dev preview screen
  (`mobile/src/components/demo/`, PP-101).
- Scheduled periodic model retraining: a lock-guarded `retrain_model` scheduler
  job that retrains the configured algorithm on an interval and refreshes
  upcoming predictions, gated by `MODEL_RETRAINING_ENABLED` /
  `MODEL_RETRAINING_INTERVAL_DAYS` (`app/scheduler/jobs.py`, PP-59).
- Model-version-aware prediction refresh
  (`refresh_predictions_for_upcoming`) that regenerates upcoming-match
  predictions whenever a newly trained model version becomes active
  (`app/services/prediction.py`, PP-58).
- Demo-style MatchCard v2 with AI pick, confidence, odds tier badge, form dots,
  and Details CTA for Epic 9 demo parity (`MatchCardV2`, PP-102).
- Ingestion failure alerting for the live sync pipeline via structured
  `pro_pick.ingestion` error logs in the scheduler and
  `sync_live_fixtures` CLI (PP-52).
- Demo parity theme tokens for elevated surfaces, glow accents, chart palette,
  alert colors, and typography variants (`hero`, `statValue`, `badge`,
  `sectionSubtitle`) in `mobile/src/theme/` (PP-99).
- Free-tier live sync for Premier League and La Liga using date-based fixture
  imports, stub predictions, value bets, scheduler, and
  `python -m app.scripts.sync_live_fixtures` (PP-51).
- Baseline 1X2 model: a multinomial logistic-regression pipeline trained on the
  historical feature dataset that outputs home/draw/away probabilities
  (`app/ml/baseline.py`, PP-54).
- XGBoost 1X2 model with light chronological-hold-out tuning over the same
  feature vector as the baseline (`app/ml/xgboost_model.py`, PP-55).
- Out-of-sample model evaluation: walk-forward backtesting that scores the model
  and the margin-removed bookmaker probabilities on held-out matches with
  accuracy, multiclass log loss, and the (calibration-sensitive) Brier score,
  plus one-vs-rest isotonic probability calibration (`app/ml/evaluation.py`,
  `app/ml/backtest.py`, `app/ml/calibration.py`, PP-56).
- Model persistence and versioning: a training pipeline that builds the
  point-in-time dataset, fits and optionally calibrates the selected algorithm,
  records walk-forward metrics, and writes a versioned model bundle
  (`app/ml/storage.py`, `app/ml/train.py`, PP-57).
- Model-backed prediction service that loads the persisted model to produce
  versioned 1X2 probabilities, falling back to a neutral distribution before a
  model is trained (`app/services/prediction.py`, PP-58).
- Reproducible, point-in-time feature engineering for the 1X2 model: recent
  form, home/away form, goals for/against, head-to-head, league standing, and
  rest days, plus a training-dataset builder over finished matches
  (`app/ml/features.py`, PP-53). Injuries are deferred until an injuries data
  source exists.
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

### Fixed
- Mobile: declare `expo-linear-gradient` in `package.json` so Analytics charts and
  gradient UI work on a fresh clone (PP-109).

### Changed
- Home and Favorites screens now use MatchCard v2; legacy MatchCard removed
  (PP-106).
- Home screen stat grid replaced with AI Predictions hero showing win rate, average
  odds, and value bet count; top value bets section uses demo section header
  styling (PP-105).
- Match detail screen redesigned with confidence ring, probability chart, live odds
  movement, and AI vs market analysis using shared demo components (PP-104).
- Matches screen rebuilt with search, status and odds-tier filters, MatchCard v2
  list, and header subtitle; date picker removed from Matches (PP-103).
- MatchCard v2 now consumes shared demo UI components instead of local card
  parts (PP-101).
- Mobile app shell polish: darker tab bar with green active indicator, consistent
  stack headers, and Match Predictions title with subtitle space on Matches
  (PP-100).
- Daily scheduler now runs date-based live sync for configured leagues instead
  of season-based imports (PP-51 supersedes PP-50).
- Mobile Home and Matches screens show a forward seven-day window when upcoming
  fixtures exist (PP-51).
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
