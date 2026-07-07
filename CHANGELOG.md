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
- GitHub Actions workflow to auto-deploy Render after CI passes on `main`
  (`.github/workflows/deploy-render.yml`; set `RENDER_DEPLOY_HOOK_URL` in repo
  secrets — see `backend/README.md`).
- **Automatic team/country history backfill.** Results-derived features (form,
  goals, rest days, Elo, head-to-head) are built from stored finished matches, so
  teams with little history — national sides in a tournament especially — got
  near-default features and near-coin-flip predictions (e.g. two different
  matchups producing identical probabilities). Each sync now finds upcoming-slate
  teams below a history threshold and pulls their recent finished fixtures across
  all competitions (one API call per team, results only, capped per run) *before*
  refreshing predictions, so their features carry real signal. New
  `FootballApiClient.get_team_fixtures`, `HistoricalDataImporter.backfill_team_history`,
  `services/history_backfill.py`, and a `python -m app.scripts.backfill_team_history`
  CLI for one-off runs. Tunable via `HISTORY_BACKFILL_ENABLED`,
  `HISTORY_BACKFILL_MIN_MATCHES`, `HISTORY_BACKFILL_LAST_FIXTURES`, and
  `HISTORY_BACKFILL_MAX_TEAMS`.
- **Prediction backfill for recently finished matches.** Predictions (1X2 and
  BTTS/Over-Under) were only refreshed while a match was upcoming, so matches that
  finished before the models/features were ready kept a stale neutral `fallback`
  1X2 row (a flat 0.40/0.28/0.32) and never got market rows — the Completed tab
  then had nothing real to show. Each sync now backfills real 1X2 + market picks
  for finished matches within a rolling window (point-in-time features, so
  leakage-safe; skips matches already on the current model version, so repeat
  syncs are cheap), and a `python -m app.scripts.backfill_finished_predictions`
  CLI covers one-off runs. Tunable via `FINISHED_BACKFILL_ENABLED`,
  `FINISHED_BACKFILL_WINDOW_DAYS`, and `FINISHED_BACKFILL_MAX_MATCHES`
  (`backend/app/services/prediction.py`, `backend/app/services/market_prediction.py`,
  `backend/app/services/live_sync.py`).

### Changed
- Analytics tab: replaced the "Prediction Outcomes" home/draw/away count cards
  with a "Prediction Markets" section that lists the markets the model covers
  (`1X2`, `BTTS`, `Over/Under 2.5`) without counts, so the section reads as market
  coverage instead of a home-win-heavy tally (`mobile/src/screens/AnalyticsScreen.tsx`,
  `mobile/src/screens/analyticsUtils.ts`).
- **Matches "Completed" tab now mirrors "Upcoming".** It previously showed every
  finished fixture and always fell back to the raw 1X2 (home/away) pick, even when
  the model wasn't confident. It now surfaces only matches the model made a
  confident call on — high confidence, or lower confidence at high odds — and shows
  those picks across all markets (`1X2`, `BTTS`, `Over/Under 2.5`) instead of just
  home/away, using the same filter as Upcoming
  (`mobile/src/screens/MatchesScreen.tsx`, `mobile/src/screens/matchesFilterUtils.ts`).

### Fixed
- Home hero **Value Bets** now counts only bets on confident picks shown in the
  list below, instead of every upcoming value bet in the database
  (`mobile/src/screens/homeHeroUtils.ts`, `mobile/src/screens/HomeScreen.tsx`).
- Analytics **Confidence Trend** no longer flatlines at 40: the trend fetch now
  excludes neutral `fallback` predictions (a fixed 0.40/0.28/0.32 distribution
  that dominated the newest inserts) so the chart reflects the real model's
  varying confidence, falling back to the unfiltered set only when no
  model-backed predictions exist yet (`backend/app/services/analytics.py`).
- Completed match cards on the Matches grid no longer truncate team names: hide
  form badges when scores are shown in compact mode, allow two-line names, and
  stack the AI pick label above confidence badges (`mobile/src/components/matchCard/MatchCardV2.tsx`).
- Completed match cards show the model's 1X2 pick even when odds are missing or
  the fixture no longer clears the upcoming confidence filter
  (`mobile/src/utils/marketPicks.ts`).
- Ignore legacy `double_chance` rows when building market picks so `GET /matches`
  no longer 500s after that market was removed (`backend/app/services/match_enrichment.py`).

### Removed
- Dropped the **Double Chance** market from the model and app. Double Chance
  (home-or-draw / home-or-away / draw-or-away) is a low-odds safe bet that adds
  little value, so predictions now cover only **1X2**, **BTTS**, and **Over/Under
  2.5**. Removed its training path, per-leg binary model, prediction branch, and
  mobile labels/types (`backend/app/ml/market_labels.py`,
  `backend/app/ml/market_train.py`, `backend/app/ml/binary_model.py`,
  `backend/app/ml/storage.py`, `backend/app/services/market_prediction.py`,
  `mobile/src/utils/marketLabels.ts`, `mobile/src/api/types.ts`).

### Fixed
- `GET /matches` no longer runs on-demand market model inference for every row;
  list responses use persisted market predictions only, which makes the matches
  tab load much faster on Render (`backend/app/services/match_list_enrichment.py`,
  `backend/app/services/match_enrichment.py`).

### Changed
- Mobile loads matches only when the tab is focused, after the dashboard returns,
  and requests 50 rows instead of 200 so Render is not hit with parallel heavy
  queries on cold start (`mobile/src/screens/HomeScreen.tsx`,
  `mobile/src/screens/MatchesScreen.tsx`, `mobile/src/utils/matchDates.ts`,
  `mobile/src/api/hooks.ts`, `mobile/src/api/client.ts`).

### Fixed
- `GET /matches` and `GET /predictions` no longer return **500 / "Failed to
  fetch"** when a match has a malformed or retired secondary-market row (an
  unknown market key or a null probabilities blob). Enrichment now skips
  unrenderable market rows instead of raising, so one bad row can't take down the
  whole list or a match's detail (`backend/app/services/match_enrichment.py`).
  This also makes the Double Chance removal safe to deploy over existing
  `double_chance` rows.
- Value bet detection now compares **stats-only** model probabilities to the
  best price per outcome across all bookmakers (line shopping), and lowers the
  default edge threshold to 2%, so more genuinely mispriced lines are surfaced
  after sync (`backend/app/services/value_bets.py`,
  `backend/app/services/prediction.py`, `backend/app/core/config.py`).

### Changed
- Analytics **"High Confidence"** now reports the active model's out-of-sample
  coverage rate (~19%) instead of a raw count of stored predictions clearing the
  threshold. The count (~3%) was misleading: most stored predictions are stale
  rows from older/neutral models without odds or history, so it undercounted the
  model's true high-confidence rate. It now uses the same model-metadata source
  as the accuracy cards (`confident_coverage`), falling back to the stored share
  only when no model metadata is available (`mobile/src/screens/analyticsUtils.ts`).
- Confidence filter is now a **fixed high-confidence bar** instead of a
  slate-relative one. Picks are only surfaced when the model clears the canonical
  **0.70** threshold; on a weak slate the app shows fewer (or no) picks rather
  than the "best of a mediocre bunch", which was letting ~50–60% calls onto Home.
  The high-odds exception is kept — long-price (underdog) 1X2 picks may clear a
  relaxed **0.40** floor, since a lower model probability at a long price can
  still be a genuine edge ("if the odds are high, the confidence doesn't need to
  be as high"). Secondary markets (BTTS, Over/Under 2.5) always require 0.70.
  Removed the slate-relative quantile machinery
  (`mobile/src/utils/confidence.ts`, `mobile/src/utils/marketPicks.ts`,
  `mobile/src/components/matchCard/MatchCardV2.tsx`).
- Raised the high-odds confidence floor from **0.40 to 0.45**. It only applies to
  picks priced at odds >= 3.5 (book implies <= ~28.6%); 0.45 keeps a clear ~16pt
  edge over the book and sits comfortably above random (0.333), so the exception
  surfaces genuine value underdogs without dropping near-noise
  (`mobile/src/utils/confidence.ts`).
- Renamed the Home date selector's week chip from "This week" to "Coming up" (and
  its empty state to "No confident picks coming up") since the selector can now
  anchor to a future slate rather than the current calendar week
  (`mobile/src/components/DatePickerRow.tsx`, `mobile/src/screens/HomeScreen.tsx`).

### Fixed
- Home no longer looks empty during a fixture gap (e.g. between the World Cup and
  the domestic-season restart). The dashboard now returns
  `next_prediction_kickoff` (the earliest upcoming match that actually has a
  prediction), and the app anchors its date selector there instead of sitting on
  an empty "today" when the only near fixtures are unpredicted. Falls back to
  today (in-season) and to the latest fixture when nothing is upcoming
  (`backend/app/api/dashboard.py`, `backend/app/schemas/common.py`,
  `mobile/src/api/types.ts`, `mobile/src/utils/matchDates.ts`,
  `mobile/src/hooks/useMatchDateAnchor.ts`).

### Changed
- Home now opens on the **"Coming up"** view by default (instead of a single
  day), and the current day's chip reads **"Today"** rather than the full date
  (`mobile/src/screens/HomeScreen.tsx`, `mobile/src/utils/matchDates.ts`).
- "Coming up" on Home now shows the soonest **10 confident** upcoming picks
  across a rolling **7-day** window, instead of the current calendar week (which
  shrank to almost nothing later in the week). Seven days matches the weekly
  fixture cadence and the horizon over which bookmakers post prices, so picks
  stay fresh and renderable (`mobile/src/screens/HomeScreen.tsx`,
  `mobile/src/screens/homeMatchUtils.ts`, `mobile/src/hooks/useMatchDateAnchor.ts`,
  `mobile/src/utils/matchDates.ts`).
- Match detail now only surfaces **BTTS** and **Over/Under 2.5** picks when the
  model is genuinely confident (at or above the canonical 0.70 threshold),
  matching the selective behaviour of the Home and Matches cards instead of
  always listing every secondary market (`mobile/src/screens/MatchDetailScreen.tsx`,
  `mobile/src/utils/confidence.ts`).
- Match cards on Home and Matches now show only the **highest-confidence** AI
  pick plus a compact `+N more` hint when other qualifying markets exist; full
  market breakdown stays on match detail (`mobile/src/components/matchCard/MatchCardV2.tsx`,
  `mobile/src/utils/marketPicks.ts`).

### Added
- Linked the mobile app to its EAS project (`@propick1/mobile`) by recording the
  `extra.eas.projectId` and `owner` in `app.json`, and configured the production
  iOS `submit` profile with the App Store Connect app id (`ascAppId`) and
  `appleTeamId` — authentication uses an App Store Connect API key via env vars,
  so no personal Apple ID is stored in the repo — letting EAS Build/Submit
  produce and upload TestFlight builds non-interactively. Also set
  `ios.infoPlist.ITSAppUsesNonExemptEncryption` to `false` (the app uses only
  standard HTTPS) so builds skip the manual export-compliance prompt in App
  Store Connect (`mobile/app.json`, `mobile/eas.json`).
- Live and finished match **scores** on match cards and detail: the API now
  exposes `home_goals` and `away_goals`, and the mobile app shows them beside
  team names for live and completed fixtures with a Live badge on in-play matches
  (`backend/app/schemas/common.py`, `backend/app/api/matches.py`,
  `mobile/src/utils/matchScoreUtils.ts`, `mobile/src/components/matchCard/MatchCardV2.tsx`,
  `mobile/src/screens/MatchDetailScreen.tsx`).

### Fixed
- Match detail no longer overlaps "More AI Markets" cards with Live Market Data on
  mobile: column flex only applies in the wide two-column layout
  (`mobile/src/screens/MatchDetailScreen.tsx`).
- Matches tab filter switches no longer block the grid behind a full-screen
  spinner while the next status query loads; Live and Completed lists show every
  match returned by the API instead of hiding fixtures that fail the Home
  confidence filter, and the Live segment polls for updates while focused
  (`mobile/src/screens/MatchesScreen.tsx`, `mobile/src/api/hooks.ts`,
  `mobile/src/screens/matchesFilterUtils.ts`, `mobile/src/utils/marketPicks.ts`).

### Added
- Match cards and detail now surface **BTTS**, **Over/Under 2.5**, and **Double
  Chance** picks from `prediction.markets`, each with its own slate-relative
  confidence bar so only qualifying secondary markets appear alongside 1X2 on
  Home and Matches (`mobile/src/utils/marketPicks.ts`,
  `mobile/src/utils/marketLabels.ts`, `mobile/src/components/matchCard/MatchCardV2.tsx`,
  `mobile/src/screens/MatchDetailScreen.tsx`, `mobile/src/api/types.ts`).
- Multi-market predictions for **BTTS**, **Over/Under 2.5**, and **Double
  Chance**: separate calibrated logistic models per market, persisted in
  `market_predictions`, exposed as nested `markets` on match/prediction API
  payloads with per-market recommended outcome and confidence
  (`backend/app/ml/market_labels.py`, `backend/app/ml/binary_model.py`,
  `backend/app/ml/market_train.py`, `backend/app/services/market_prediction.py`,
  `backend/app/schemas/common.py`, Alembic migration
  `a1b2c3d4e5f7_add_market_predictions`).
- Home and Matches tabs are now selective: instead of showing a pick for every
  fixture, they surface only the slate's most confident picks. A slate-relative
  confidence bar keeps roughly the strongest ~28% of a day's predictions (72nd
  percentile), clamped between a 0.50 floor and the canonical 0.70 threshold, so
  a confident domestic slate behaves like a fixed 70% filter while a balanced
  international slate still shows its strongest calls instead of going empty.
  High-odds (underdog) value picks are judged against a relaxed 0.40 floor so a
  genuine edge at a long price still surfaces. Empty states now read "No
  confident picks…" (`mobile/src/utils/confidence.ts`,
  `mobile/src/screens/HomeScreen.tsx`, `mobile/src/screens/MatchesScreen.tsx`,
  `mobile/src/screens/matchesFilterUtils.ts`).
- Home date selector now starts with a "This week" chip (styled like the day
  chips) that filters the slate to the current local calendar week (Mon–Sun),
  while a day chip filters to that exact calendar day only. Week and day
  comparisons use the device's local zone so matches never appear under the
  wrong day (`mobile/src/components/DatePickerRow.tsx`,
  `mobile/src/screens/HomeScreen.tsx`, `mobile/src/screens/homeMatchUtils.ts`,
  `mobile/src/utils/matchDates.ts`).

### Changed
- Value bets now reflect only upcoming fixtures. The dashboard scopes both the
  "Top Value Bets" list and the new uncapped `upcoming_value_bets` count to
  matches that have not kicked off yet (`kickoff >= now`), and the `GET
  /value-bets` list hides bets for already-started matches (except when a
  `match_id` is supplied, so a match's detail page still shows its bet). The
  Home hero "Value Bets" stat reads `upcoming_value_bets` so it can exceed five
  (`backend/app/api/dashboard.py`, `backend/app/api/value_bets.py`,
  `backend/app/schemas/common.py`, `mobile/src/api/types.ts`,
  `mobile/src/screens/homeHeroUtils.ts`).
- Lowered the value-bet edge threshold from 5% to 3% so more genuine edges are
  surfaced; 5% was conservative enough that very few fixtures qualified
  (`backend/app/core/config.py`).
- The live notification poll now fetches fresh fixture status each cycle and
  detects match status transitions (match start/end, half-time, second half,
  penalty shootout) on every run instead of only during the once-daily sync,
  and automatically polls every minute while a tracked match is live (relaxing
  back to the configured interval otherwise) so those events fire close to real
  time (`backend/app/services/match_notification_events.py`,
  `backend/app/scheduler/jobs.py`).
- Home hero "Avg Odds" now averages the odds of each match's recommended 1X2
  pick across the matches actually shown (instead of blending every
  home/draw/away price, which skewed high), and "Value Bets" now counts today's
  value bets instead of the all-time database total
  (`mobile/src/screens/homeHeroUtils.ts`, `mobile/src/screens/HomeScreen.tsx`).

### Added
- Bookmaker **market features** for the 1X2 model: the margin-removed implied
  probabilities of the best-price book (`market_prob_home/draw/away`), its
  overround, and a `has_market_odds` flag. The market line is the sharpest
  available prior (it already prices in injuries, line-ups, suspensions and money
  flow) and odds are a pre-match signal, so this is a strong, leakage-free input
  that the previous results-only model (form, H2H, table, rest days, Elo) could
  not see. Wired into both training and inference; matches without odds get
  zeroed market columns plus the flag so the model leans on the market only when
  present. Changing the feature schema triggers the startup bootstrap to retrain;
  `predict_match` now degrades to neutral instead of crashing if a loaded model's
  schema no longer matches the code (`backend/app/ml/market_features.py`,
  `backend/app/ml/features.py`, `backend/app/services/prediction.py`).
- `python -m app.scripts.backfill_odds` CLI to fetch and store odds for already
  imported matches that have none, so historical training data has market-feature
  signal. Resilient like the live sync (skips per-match failures, stops after
  repeated failures) and selectable by status/limit
  (`backend/app/scripts/backfill_odds.py`,
  `backend/app/services/historical_import.py`).
- Expo push notifications end-to-end: device token registration, per-match
  notification preferences stored in the backend, live match event detection
  (goals, cards, kick-off, full-time, line-ups, etc.), deduplicated delivery
  via the Expo Push API, a `POST /notifications/test` endpoint, and a
  `python -m app.scripts.test_push_notification` CLI helper. Mobile registers
  push tokens on launch, syncs modal toggles to the API, and opens match detail
  when a notification is tapped.
- Home tab now groups matches into High / Medium / Low **Odds** tier sections
  (highest odds first), each with a tier icon and an "N matches available" count
  (replacing the single flat "Matches" list), matching the design reference. Tier
  is derived from the price of the model's recommended outcome
  (`mobile/src/screens/homeMatchUtils.ts`, `mobile/src/screens/HomeScreen.tsx`,
  `mobile/src/components/demo/SectionHeader.tsx`).
- Match cards now show a dynamic, fixture-specific headline insight derived from
  the recommended outcome, model confidence and each side's recent form (e.g.
  "Alpha unstoppable right now", "Evenly matched, honours likely shared"),
  replacing the backend's repetitive templated line. Each confidence band has
  several variants picked deterministically per fixture so different matches read
  differently instead of all repeating one line; the copy is venue-neutral (no
  "at home"/"on the road") since tournament fixtures are played at neutral
  grounds, and avoids dash separators
  (`mobile/src/components/matchCard/matchInsightUtils.ts`,
  `mobile/src/components/matchCard/MatchCardV2.tsx`).
- Home "AI Predictions" hero now shows a live status pill and an
  "N upcoming predictions" subtitle that counts the predictions actually shown
  on the Home slate (previously it said "N verified predictions today", which
  only counted today's kickoffs and read as wrong next to the multi-day slate),
  and the Home "Matches" section shows an
  "N matches available" count — closing visual gaps against the design
  reference (`mobile/src/components/demo/AiPredictionsHero.tsx`,
  `mobile/src/components/demo/LiveBadge.tsx`,
  `mobile/src/screens/homeHeroUtils.ts`, `mobile/src/screens/HomeScreen.tsx`).
- Analytics screen header now carries the
  "Deep insights into AI model performance" subtitle, matching the Home and
  Matches headers (`mobile/src/navigation/screenTitles.ts`,
  `mobile/src/navigation/RootNavigator.tsx`).
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

### Changed
- Live sync now covers a 7-day forward window by default
  (`SYNC_DATE_OFFSETS=-1,0,1,2,3,4,5,6,7` instead of `-1,0,1`), so upcoming
  fixtures (e.g. a full World Cup bracket) get odds — and therefore predictions
  surfaced on Home/Matches — ahead of kickoff instead of only the next day. Each
  forward day costs ~1 fixtures call plus one `/odds` call per match, so narrow it
  on the free API tier (set the env var on Render to override the default)
  (`backend/app/core/config.py`, `backend/.env.example`, `backend/README.md`).
- Odds import is now resilient: a provider error on a single match's `/odds` call
  is logged and skipped instead of rolling back the whole sync batch, and after
  several consecutive failures (e.g. quota exhaustion) the importer stops fetching
  odds for the rest of the batch while still committing the fixtures it imported.
  The live-sync summary/log now reports the number of failed odds fetches
  (`backend/app/services/historical_import.py`,
  `backend/app/services/live_sync.py`).
- Recent-form indicators on match cards now render as circular **W/D/L** letter
  badges (muted, semi-transparent fills with a bright letter) instead of plain
  colored dots, matching the design reference across Home and Matches
  (`mobile/src/components/demo/FormIndicator.tsx`).
- Value bets, odds-tier classification, and the displayed odds now use the
  best-price bookmaker for each match (the book with the lowest margin /
  overround) instead of the alphabetically first one. This stops understating
  edge/EV and missing value bets, and keeps a single, deterministic odds source
  across the API, list enrichment, and value-bet engine
  (`backend/app/services/value_bets.py`, `backend/app/api/matches.py`,
  `backend/app/services/match_list_enrichment.py`).
- Analytics "Prediction Outcomes" now stretches its three cards (Home / Draw /
  Away) evenly across the full width instead of left-aligning fixed-width cards
  in a horizontal scroll, removing the empty space on the right left after the
  Both Teams Score / Over 2.5 cards were dropped
  (`mobile/src/screens/AnalyticsScreen.tsx`).
- Home "Top Value Bets" cards now show the fixture (teams, league, kickoff) and
  the picked 1X2 outcome alongside edge, EV, odds, and stake, instead of a bare
  stat line. The separate margin-based "Confidence" figure was removed so
  "confidence" means one thing app-wide (the match-card top-pick probability)
  (`mobile/src/components/ValueBetCard.tsx`, `mobile/src/screens/HomeScreen.tsx`).
- Analytics now reflects the single market we actually model (1X2): the
  "Prediction Outcomes" breakdown shows Home/Draw/Away only, and the
  "AI Model Performance" row replaces the placeholder "Markets Covered" stat
  with the model's Log Loss. Removed the always-zero "Both Teams Score" and
  "Over 2.5" outcome cards and the `markets_covered` field
  (`backend/app/services/analytics.py`, `backend/app/schemas/common.py`,
  `backend/app/api/analytics.py`, `mobile/src/screens/analyticsUtils.ts`,
  `mobile/src/api/types.ts`).
- Home tab now shows a fuller slate: the match floor was raised from 3 to 12, so
  a quiet day tops up to ~12 (≈ four per odds tier) from upcoming days while a
  busy day still renders its full slate (`mobile/src/screens/homeMatchUtils.ts`).
- Removed the "Confident picks" caption under the Home hero "Win Rate" stat
  (`mobile/src/screens/homeHeroUtils.ts`,
  `mobile/src/components/demo/AiPredictionsHero.tsx`).
- Analytics now headlines the high-confidence accuracy (~70%) instead of the
  full-slate accuracy: the "Model Accuracy" summary card and the AI Model
  Performance "Accuracy" column both read from `confident_accuracy` and are
  captioned "With high confidence". The full-slate figure (~51%) is no longer
  surfaced anywhere on the Analytics tab (`mobile/src/screens/analyticsUtils.ts`).
- Favorites now star a whole match instead of a team: the card star toggles the
  match, and the Favorites tab lists those starred matches (fetched by id, sorted
  by earliest kickoff) to match the design. Removed the unused team/competition
  favoriting code (`mobile/src/store/favoritesStore.ts`,
  `mobile/src/screens/FavoritesScreen.tsx`,
  `mobile/src/components/matchCard/MatchCardV2.tsx`).
- Daily live sync now refreshes upcoming predictions instead of skipping any
  match that already has one, so picks stop going stale between retrains as new
  results shift form/Elo/table features. A fresh prediction is written only when
  the active model or probabilities change, and value bets follow the refreshed
  prediction (`app/services/prediction.py`, `app/services/live_sync.py`).
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

### Removed
- Dropped the standalone "Top Value Bets" section from the Home tab; matches are
  now presented purely as the High/Medium/Low odds-tier groups, matching the
  design reference (`mobile/src/screens/HomeScreen.tsx`).

### Fixed
- Kickoff times now display in the user's local timezone. The API serializes
  naive UTC timestamps with no timezone (e.g. `2026-06-30T17:00:00`), which
  `new Date()` parsed as local time — showing times off by the device's UTC
  offset (e.g. Ivory Coast vs Norway as 5pm instead of 7pm in NL). Added a
  shared `parseMatchDate` helper that treats a missing timezone as UTC and used
  it everywhere kickoff strings are parsed for display, grouping, sorting, and
  the kicked-off guard (`mobile/src/utils/matchDates.ts`,
  `mobile/src/components/formatters.ts`, `mobile/src/screens/matchesFilterUtils.ts`,
  `mobile/src/screens/homeMatchUtils.ts`, `mobile/src/screens/favoritesUtils.ts`).
- Root tab navigation types so Home Details can navigate to the nested Matches
  tab route without TypeScript errors.
- Mobile: declare `expo-linear-gradient` in `package.json` so Analytics charts and
  gradient UI work on a fresh clone (PP-109).
- `GET /dashboard` now returns `latest_kickoff` so clients can browse imported
  historical match weeks (PP-49).
- `mobile/LICENSE` copyright updated from Expo template text to Pro Pick.
[Unreleased]: https://github.com/tasiamah/pro-pick/commits/main
