# pro-pick — VoetbalAI

AI-gestuurde voetbalvoorspelling-app (iOS) die **value bets** identificeert.

- **Backend** (`backend/`): Python + FastAPI + SQLAlchemy. Bevat de datapijplijn, het ML-voorspelmodel en de value-bet-engine. Levert alles als JSON aan de app.
- **Mobile** (`mobile/`): React Native (Expo) + TypeScript. Toont dashboard, wedstrijdoverzicht, favorieten en analytics.

> **Disclaimer:** Deze app is uitsluitend bedoeld voor AI-analyse en entertainment. Het is geen gok- of weddenschapsdienst en biedt geen gegarandeerde uitkomsten.

## Architectuur

```
┌─────────────────┐   HTTPS   ┌──────────────────┐        ┌─────────────────┐
│   iOS App        │──────────▶│   Backend API     │───────▶│  Voetbaldata +   │
│ (React Native)   │◀──────────│   (FastAPI)       │        │  odds API (extern)│
└─────────────────┘    JSON    │  + ML-model       │        └─────────────────┘
                                │  + value bets     │        ┌─────────────────┐
                                │  + database       │───────▶│  PostgreSQL      │
                                └──────────────────┘        └─────────────────┘
```

Het ML-model en de value-bet-berekening draaien op de **backend**, niet op de telefoon. De app toont alleen resultaten.

## Snel starten

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```
Open http://localhost:8000/docs voor de interactieve API-documentatie en http://localhost:8000/health voor de healthcheck.

De backend draait standaard op **SQLite** (nul-configuratie). Voor PostgreSQL: zet `DATABASE_URL` in `.env` of gebruik `docker compose up` (zie `backend/docker-compose.yml`).

### Mobile
```bash
cd mobile
npm install
npm run ios
```

## Projectstructuur
```
pro-pick/
├── backend/          # FastAPI + ML + value bets
├── mobile/           # React Native (Expo) app
└── docs/             # Jira-backlog, planning
```

## Roadmap & planning
Zie `docs/JIRA_BACKLOG.md` voor de volledige epics/tickets en het 7-werkdagen sprintplan.
