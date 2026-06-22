# VoetbalAI — Mobile (iOS)

React Native (Expo) + TypeScript app. Toont dashboard, wedstrijdoverzicht,
favorieten en analytics op basis van de backend-API.

> Deze map bevat voorlopig alleen de structuur/README. De Expo-app wordt
> opgezet in ticket **PP-43 "Expo + RN + TypeScript-app initialiseren"**.

## Geplande structuur

```
mobile/
├── app.json
├── package.json
├── tsconfig.json
├── App.tsx                # entrypoint
└── src/
    ├── api/               # API-client + types
    ├── navigation/        # tab- en stack-navigatie
    ├── theme/             # kleuren, fonts, spacing
    ├── components/        # herbruikbare UI (MatchCard, ValueBetCard, ...)
    ├── store/             # favorieten / app-state
    └── screens/
        ├── DashboardScreen.tsx
        ├── MatchesScreen.tsx
        ├── MatchDetailScreen.tsx
        ├── FavoritesScreen.tsx
        └── AnalyticsScreen.tsx
```

## Starten (na PP-43)

```bash
npm install
npm run ios
```
