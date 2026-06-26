# Pro Pick — Mobile (iOS)

React Native (Expo) + TypeScript app. Shows the dashboard, match overview,
favorites, and analytics based on the backend API.

## Prerequisites

- Node.js 18+ (CI uses Node 20)
- For **web preview**: no extra setup
- For **physical iPhone**: [Expo Go](https://expo.dev/go) on the same Wi‑Fi as your Mac,
  or an EAS **preview** build (recommended for release-style testing)
- For **iOS Simulator**: full Xcode from the Mac App Store

## Getting started

From the repo root:

```bash
cd mobile
npm install
cp .env.example .env
npx expo start
```

Then:

| Platform | How |
|----------|-----|
| **Web** | Press `w` in the terminal, or run `npm run web` |
| **iPhone (Expo Go)** | Scan the QR code with Expo Go |
| **iPhone (EAS preview)** | `npx eas build --profile preview --platform ios` |
| **Simulator** | Press `i` in the terminal, or run `npm run ios` (requires Xcode) |

You should see four bottom tabs: **Home**, **Matches**, **Favorites**, and
**Analytics**. Home, Matches, and Favorites each open a **Match detail** screen
when you tap **Details**.

## Backend API

The app calls the FastAPI backend (see `backend/README.md`). Set
`EXPO_PUBLIC_API_URL` in `mobile/.env` (copy from `.env.example`):

```bash
EXPO_PUBLIC_API_URL=https://pro-pick.onrender.com
```

A physical phone cannot reach `localhost` on your Mac. Use the deployed backend
URL above, or point at a machine on your LAN if you run the API locally.

EAS builds inject `EXPO_PUBLIC_API_URL` from `eas.json` (preview and production
profiles target `https://pro-pick.onrender.com`).

For richer data against the deployed backend (`https://pro-pick.onrender.com`), seed
the remote database instead of SQLite. The seed script uses `DATABASE_URL` — the same
Supabase connection string configured on Render.

**GitHub Actions (no Render Shell required):**

1. Add repository secret `DATABASE_URL` in GitHub (copy from Render → pro-pick →
   Environment).
2. Run **Actions** → **Seed demo database** → **Run workflow**.

**Local against remote:**

```bash
cd backend
source .venv/bin/activate
export DATABASE_URL='postgresql+psycopg2://postgres.[PROJECT-REF]:[PASSWORD]@[POOLER-HOST]:5432/postgres'
alembic upgrade head
python -m app.scripts.seed_demo
```

See `backend/README.md` for full setup details.

## Physical device E2E test (PP-92)

Run this checklist on a **real iPhone** before TestFlight or App Store submission.
Use production API (`https://pro-pick.onrender.com`) or a seeded staging backend.
Allow up to 45 seconds for the first request while Render wakes from sleep.

### Setup

1. Copy `mobile/.env.example` to `mobile/.env` with a reachable API URL.
2. Start the app via Expo Go or install an EAS preview build.
3. Confirm the disclaimer banner appears at the top on every tab.

### Test matrix

| # | Flow | Steps | Pass criteria |
|---|------|-------|---------------|
| 1 | Cold launch | Force-quit, reopen | App loads without crash; Home tab visible |
| 2 | Home | Pull to refresh; tap a date chip; open **Details** on a match | Stats and cards load; detail screen opens |
| 3 | Matches | Search; change status filter; open **Details** | Filtered list updates; detail screen opens |
| 4 | Favorites | Toggle a favorite on a match card; open Favorites tab | Favorite persists; filtered list shows saved teams |
| 5 | Match detail | View confidence, odds, and analysis sections | Enriched fields render; back navigation works |
| 6 | Analytics | Pull to refresh | Stat cards and ROI chart render (empty state OK) |
| 7 | Tab loop | Visit all four tabs twice | No blank screens or stuck loading spinners |
| 8 | Offline recovery | Enable airplane mode, pull to refresh, disable airplane mode, retry | Error state shown offline; data loads after retry |

### Sign-off

PP-92 is **Done** when all eight flows pass with **no blocking bugs** (crash,
blank screen, unusable navigation, or permanent loading/error on a healthy API).

Record the device model, iOS version, build method (Expo Go vs EAS preview), and
API URL in the Jira ticket comment when signing off.

## Scripts

```bash
npm run lint       # ESLint (expo lint)
npm run typecheck  # TypeScript strict check
npm test           # Jest unit tests
```

## Design tokens

Demo-parity UI (EPIC-9) uses semantic tokens from `src/theme/` instead of
hard-coded colors or font sizes.

| Token group | Examples | Use |
|-------------|----------|-----|
| Surfaces | `surfaceElevated`, `cardElevated` | Elevated cards and panels |
| Accents | `primary`, `primaryGlow` | CTAs, active states, glow shadows |
| Form & odds | `win`, `loss`, `draw`, `oddsLow`, `oddsMedium`, `oddsHigh` | Form dots and odds-tier badges |
| Charts | `chartHome`, `chartDraw`, `chartAway` | Probability bar charts |
| Market | `marketBlue` | Live odds and market labels |
| Alerts | `alertWarning` | Odds movement and warning banners |
| Typography | `hero`, `statValue`, `badge`, `sectionSubtitle` | Hero stats, badges, section headers |

Import from `src/theme` (re-exported in `index.ts`).

## Project structure

```text
mobile/
├── App.tsx                 # entrypoint (NavigationContainer)
├── app.json
├── eas.json                # EAS build profiles + API URL injection
├── package.json
├── tsconfig.json           # strict: true
└── src/
    ├── api/                # API client + types (PP-75)
    ├── navigation/         # tab + stack navigators
    ├── theme/              # colors, typography, spacing, radii (Pro Pick demo)
    ├── components/         # MatchCardV2, ValueBetCard, … (PP-78)
    ├── store/              # favorites / app state
    └── screens/
        ├── HomeScreen.tsx
        ├── MatchesScreen.tsx
        ├── MatchDetailScreen.tsx
        ├── FavoritesScreen.tsx
        └── AnalyticsScreen.tsx
```

## Release — TestFlight build and beta test

The app ships to beta testers through Apple TestFlight, built with EAS Build.
Its release identity lives in `app.json` (display name `ProPick`, iOS
`bundleIdentifier` `com.propick.app`) and the build profiles live in `eas.json`.
The marketing `version` comes from `app.json`; the iOS build number is managed
remotely and auto-incremented per production build (`appVersionSource: remote`
plus `autoIncrement` on the `production` profile), so each upload gets a unique
build number without manual edits.

### One-time setup

- An Apple Developer Program membership and access to App Store Connect.
- An [Expo](https://expo.dev) account and the EAS CLI: `npm install -g eas-cli`.
- Link the project once so `app.json` gets an `extra.eas.projectId`:

```bash
cd mobile
eas login
eas init
```

### Build for TestFlight

```bash
eas build --platform ios --profile production
```

This produces a store-distribution `.ipa` signed for App Store / TestFlight.
EAS manages the signing credentials (let it generate them on first run).

### Upload to TestFlight

```bash
eas submit --platform ios --profile production
```

The `submit.production` profile in `eas.json` is intentionally minimal for now,
so `eas submit` prompts for the App Store Connect target interactively. Once the
app record exists, fill in `ascAppId` and `appleTeamId` there to make submission
non-interactive.

### Beta test and processing feedback

1. In App Store Connect → **TestFlight**, add the build to an internal (team) or
   external tester group; external groups require a short Beta App Review.
2. Testers install the build through the **TestFlight** app and can send
   feedback and screenshots from there.
3. Triage incoming feedback into Jira under **EPIC-8**, fix on a feature branch,
   then cut a new build with the same `eas build` command — the build number
   auto-increments and the updated build goes to the same tester group.
