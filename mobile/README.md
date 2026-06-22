# VoetbalAI — Mobile (iOS)

React Native (Expo) + TypeScript app. Shows the dashboard, match overview,
favorites and analytics based on the backend API.

> This folder currently contains only the structure/README. The Expo app is
> set up in ticket **PP-43 "Initialize Expo + RN + TypeScript app"**.

## Planned structure

```
mobile/
├── app.json
├── package.json
├── tsconfig.json
├── App.tsx                # entrypoint
└── src/
    ├── api/               # API client + types
    ├── navigation/        # tab and stack navigation
    ├── theme/             # colors, fonts, spacing
    ├── components/        # reusable UI (MatchCard, ValueBetCard, ...)
    ├── store/             # favorites / app state
    └── screens/
        ├── DashboardScreen.tsx
        ├── MatchesScreen.tsx
        ├── MatchDetailScreen.tsx
        ├── FavoritesScreen.tsx
        └── AnalyticsScreen.tsx
```

## Getting started (after PP-43)

```bash
npm install
npm run ios
```
