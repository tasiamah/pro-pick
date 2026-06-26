# VoetbalAI — Mobile (iOS)

React Native (Expo) + TypeScript app. Shows the dashboard, match overview,
favorites and analytics based on the backend API.

## Prerequisites

- Node.js 18+ (CI uses Node 20)
- For **web preview**: no extra setup
- For **iPhone**: [Expo Go](https://expo.dev/go) on the same Wi‑Fi as your Mac
  (requires an Expo Go version that supports SDK 56; use web if incompatible)
- For **iOS Simulator**: full Xcode from the Mac App Store

## Getting started

From the repo root:

```bash
cd mobile
npm install
npx expo start
```

Then:

| Platform | How |
|----------|-----|
| **Web** | Press `w` in the terminal, or run `npm run web` |
| **iPhone** | Scan the QR code with Expo Go |
| **Simulator** | Press `i` in the terminal, or run `npm run ios` (requires Xcode) |

You should see four bottom tabs: **Home**, **Matches**, **Favorites**,
**Analytics**. Home, Matches, and Favorites each open a **Match detail** screen
when you tap **Details**.

## Scripts

```bash
npm run lint       # ESLint (expo lint)
npm run typecheck  # TypeScript strict check
npm test           # placeholder until tests are added
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
├── package.json
├── tsconfig.json           # strict: true
└── src/
    ├── api/                # API client + types (PP-75)
    ├── navigation/         # tab + stack navigators
    ├── theme/              # colors, typography, spacing, radii (Pro Pick demo)
    ├── components/         # MatchCard, ValueBetCard, … (PP-78)
    ├── store/              # favorites / app state
    └── screens/
        ├── HomeScreen.tsx
        ├── MatchesScreen.tsx
        ├── MatchDetailScreen.tsx
        ├── FavoritesScreen.tsx
        └── AnalyticsScreen.tsx
```

## Backend API

The app calls the FastAPI backend (see `backend/README.md`). Set
`EXPO_PUBLIC_API_URL` in `mobile/.env` (copy from `.env.example`):

```bash
EXPO_PUBLIC_API_URL=http://localhost:8000
```

A physical phone cannot reach `localhost` on your Mac until backend hosting is
set up (PP-42).
