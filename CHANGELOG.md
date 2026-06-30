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
- Ship a small, version-controlled baseline model bundle
  (`backend/app/ml/pretrained_model.pkl`, ~6 KB) so a fresh deploy serves real
  predictions and honest metrics (walk-forward accuracy ~0.51, high-confidence
  accuracy ~0.70) immediately, without training on startup. The prediction
  service and the startup bootstrap now resolve the active model via
  `active_model_path()`, which prefers a runtime-trained model and falls back to
  this baseline (`app/ml/storage.py`, `app/services/prediction.py`,
  `app/scheduler/jobs.py`).
- `seed_demo --purge` command (backed by a `purge_demo_seed` service) that
  removes the demo dataset (competitions, teams, matches, predictions, odds, and
  value bets identified by their negative external ids) from a database, so
  seeded demo fixtures like Bournemouth vs Luton can be cleared from any
  environment (`app/services/demo_seed.py`, PP-108).

### Changed
- Favorites now star a whole match instead of a team: the card star toggles the
  match, and the Favorites tab lists those starred matches (fetched by id, sorted
  by earliest kickoff) to match the design. Removed the unused team/competition
  favoriting code (`mobile/src/store/favoritesStore.ts`,
  `mobile/src/screens/FavoritesScreen.tsx`,
  `mobile/src/components/matchCard/MatchCardV2.tsx`).
- Analytics dashboard restores the demo chart layout (confidence trend, risk
  distribution, prediction outcomes, model performance) wired to real `/analytics`
  data with empty states when sections have no data yet.
- Matches and Analytics stack headers left-align title and subtitle to match
  Home and Favorites.
- Home "Win Rate" stat now reports the model's high-confidence accuracy
  (captioned "Confident picks") instead of full-slate 1X2 accuracy, so the
  headline figure reflects the picks the model is surest about rather than the
  draw-capped ~51% across all matches (`mobile/src/screens/homeHeroUtils.ts`).
- Home tab no longer lists matches that have already kicked off (e.g. a fixture
  that started earlier today): it now applies the same kickoff guard as the
  Matches tab via a live clock (`useNow`), and hides Top Value Bets whose match
  has started. To avoid a sparse list once started matches drop off, the Matches
  section tops up to at least 3 by appending the soonest upcoming matches from
  later days (`mobile/src/screens/HomeScreen.tsx`,
  `mobile/src/screens/homeMatchUtils.ts`).
- Live sync now includes FIFA World Cup (league id 1) so finished World Cup
  results and scores refresh from API-Football instead of staying stuck on
  `scheduled` after kickoff.
- Completed matches list returns the most recent fixtures first so the Matches
  tab Completed filter shows latest results instead of the oldest page of fifty.
- Matches tab now sorts Upcoming and Live by earliest kickoff first (Completed
  stays most-recent-first), so the soonest match leads instead of one days out
  (`mobile/src/screens/matchesFilterUtils.ts`).
- Home match card Details opens the selected match detail screen instead of
  switching to the Matches tab.
- Mobile app shows kickoff times, browse date chips, and day grouping in the
  device's local timezone instead of UTC, and the Upcoming filter no longer lists
  matches whose kickoff has already passed (`mobile/src/utils/matchDates.ts`,
  `mobile/src/components/formatters.ts`, `mobile/src/screens/matchesFilterUtils.ts`).
- Matches list API latency: batch enrichment (one history query per page) and
  smaller default browse window; Matches tab shows filters while loading instead
  of a full-screen spinner.
- Mobile app no longer shows placeholder demo fixtures (e.g. Bournemouth vs
  Luton) or hardcoded analytics now that the backend serves real data: the
  Matches and Match-detail screens render live API data with empty states, and
  the Analytics screen is wired to `/analytics` (accuracy, log loss, ROI, value
  bet counts, and a real ROI-trend chart). The demo-only confidence-trend and
  risk-distribution charts and their seed data were removed.
- Dashboard and analytics API latency: optimized snapshot queries, short-lived
  metrics cache, Supabase pool limits, and SQL pagination for unfiltered match
  lists so production `/dashboard` no longer exhausts DB connections.
- Matches browse grid: equal-width columns with computed gutters and padding so
  cards stay inside the screen, plus extra scroll space above the tab bar.
  Rows use matched card heights and compact card layout in the grid; orphan
  cards keep half-width instead of stretching full row.
- Bottom tab bar labels no longer clip on web and devices with a home indicator;
  tab bar height now includes safe-area bottom padding.
- Match detail modal: zero-edge outcomes no longer show a misleading edge bar
  fill, and demo odds movement appears only after Update Odds is tapped.
- Match detail routing rejects unsafe integer ids; demo match kickoffs are
  generated relative to the current date so browse cards stay upcoming.
- Matches browse grid keeps two columns on phone widths by using
  `space-between` spacing instead of horizontal gap with 48% columns.

### Changed
- Matches browse grid lists fixtures in reverse kickoff order (newest first) and
  uses tighter compact-card typography so team names, badges, and insights match
  the demo reference in the two-column layout.
- Dashboard/`analytics` model accuracy now comes from the live model's
  walk-forward backtest metadata (honest out-of-sample) instead of re-scoring
  stored predictions, which read low (~0.44) when finished matches still held
  predictions from an earlier model; the real number is ~0.51.
- Startup bootstrap also retrains when the on-disk model's `feature_columns` no
  longer match the code, so a deploy that changes the feature set (e.g. adding
  Elo) ships a fresh model instead of serving a stale-schema one.
- Value-bet engine quality guard: bets on odds above `value_bet_max_odds`
  (default 6.0) or below `value_bet_min_confidence` (default 0.0) are no longer
  flagged as value, keeping unreliable longshots and near-coin-flip picks out of
  recommendations.
- Match detail modal: screenshot-style layout with AI confidence ring, win
  probability chart, numbered key insights, live market data, and per-outcome
  AI vs market analysis cards. Opens as a modal with close button; demo match
  cards use static data without API calls.
- Matches tab browse grid: two-column card layout with static demo matches when
  the API list is empty, plus green border hover on web.
- Home match card Details link: centered, lighter demo-style footer bar and
  navigation to the selected match detail screen. Shared footer/link tokens and
  regression tests prevent accidental revert when switching branches.
- Analytics dashboard demo UI: summary stats, confidence trend, risk distribution,
  prediction outcomes, and AI model performance sections with static mock data
  until the analytics API is extended.
- Confidence Trend chart: interactive hover with crosshair, highlighted point,
  and tooltip showing the nearest data label and value.
- Confidence Trend chart hover now tracks mouse movement on web instead of
  requiring click-and-drag from gifted-charts pointerConfig.
- Confidence Trend chart uses native touch scrubbing on iOS (PanResponder) so
  drag across the chart shows crosshair, point, and tooltip without relying on
  web-only mouse events.
- Risk Distribution doughnut chart: interactive hover/touch with segment explode
  and tooltip showing risk category and value.
- Analytics header: removed unrequested subtitle under Analytics Dashboard.
- Mobile UI/UX polish for demo parity: shared screen layout styles, consistent
  section headers and stat typography, and theme tokens for micro, metric, and
  label-strong text (PP-90).

### Fixed
- Root tab navigation types so Home Details can navigate to the nested Matches
  tab route without TypeScript errors.

### Added
- Elo team-strength features (`home_elo`, `away_elo`, `elo_diff`) to the 1X2
  model: point-in-time ratings replayed from results, capturing longer-horizon
  quality than the 5-game form window.
- High-confidence accuracy metric: dashboard and `/analytics` now report
  `confident_accuracy` and `confident_coverage` — accuracy on the subset of
  picks whose top probability clears `model_confidence_threshold` (default 0.70,
  ~70% accurate on ~19% of matches out-of-sample), alongside the full-slate
  accuracy that the ~25% draw rate caps near 0.51.
- Startup model bootstrap: when no model artifact exists, the app trains one in
  a background thread on startup (`model_bootstrap_enabled`, default on) so a
  fresh deploy serves real predictions instead of the neutral fallback without
  waiting for the first scheduled retraining.
- Render release script (`backend/scripts/release.sh`) running
  `alembic upgrade head`, documented as the Pre-Deploy Command so deploys apply
  pending database migrations automatically (prod was previously left on an
  out-of-date schema).
- Privacy policy and App Store Connect App Privacy guide, plus an in-app Privacy
  Policy link on the disclaimer banner (PP-96).
- Physical device E2E test checklist for iPhone sign-off before TestFlight, plus
  longer API timeouts for Render cold starts and dark-mode Expo config (PP-92).
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
- App Store compliance: a dismissible disclaimer banner that opens an in-app
  About screen (entertainment-only disclaimer, 18+/responsible-gambling
  guidance, independence from any bookmaker) plus a self-contained in-app
  Privacy Policy screen, so the policy is always reachable without an external
  link (PP-93).
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
