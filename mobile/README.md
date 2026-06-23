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

You should see four bottom tabs: **Dashboard**, **Matches**, **Favorites**,
**Analytics** (placeholder screens for now).

## Scripts

```bash
npm run lint       # ESLint (expo lint)
npm run typecheck  # TypeScript strict check
npm test           # placeholder until tests are added
```

## Project structure

```text
mobile/
├── App.tsx                 # entrypoint (NavigationContainer)
├── app.json
├── package.json
├── tsconfig.json           # strict: true
└── src/
    ├── api/                # API client + types (PP-75)
    ├── navigation/         # RootNavigator (bottom tabs)
    ├── theme/              # colors, fonts, spacing (PP-77)
    ├── components/         # MatchCard, ValueBetCard, … (PP-78)
    ├── store/              # favorites / app state
    └── screens/
        ├── DashboardScreen.tsx
        ├── MatchesScreen.tsx
        ├── FavoritesScreen.tsx
        └── AnalyticsScreen.tsx
```

## Backend API

The app will call the FastAPI backend (see `backend/README.md`). During local
development the API defaults to `http://localhost:8000` once the API client is
added (PP-75). A physical phone cannot reach `localhost` on your Mac until
backend hosting is set up (PP-42).
