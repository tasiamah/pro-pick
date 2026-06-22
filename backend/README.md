# VoetbalAI — Backend

FastAPI-backend met datapijplijn, ML-voorspelmodel en value-bet-engine.

## Starten (lokaal, SQLite — nul-configuratie)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

- API-docs (Swagger): http://localhost:8000/docs
- Healthcheck: http://localhost:8000/health

## PostgreSQL (Docker)

```bash
docker compose up --build
```

Of zet zelf een `DATABASE_URL` in `.env`:

```
DATABASE_URL=postgresql+psycopg2://voetbalai:voetbalai@localhost:5432/voetbalai
```

## Tests

```bash
pytest
```

## Structuur

```
app/
├── main.py            # FastAPI entrypoint
├── core/              # config + database
├── api/               # endpoints (health, matches, predictions, value_bets, analytics, dashboard)
├── models/            # SQLAlchemy-modellen
├── schemas/           # Pydantic request/response-modellen
├── services/          # data_ingestion, prediction, value_bets
├── ml/                # features, train, model.pkl
└── scheduler/         # geplande taken (dagelijkse update)
```

## Endpoints (v1)

| Methode | Pad | Omschrijving |
|---------|-----|--------------|
| GET | `/health` | Healthcheck |
| GET | `/dashboard` | Samengevat overzicht |
| GET | `/matches` | Wedstrijdoverzicht |
| GET | `/matches/{id}` | Wedstrijddetail |
| GET | `/predictions` | Voorspellingen |
| GET | `/value-bets` | Value bets |
| GET | `/analytics` | Modelprestaties & ROI |

> De data-ingestie, het ML-model en de scheduler zijn als stubs opgezet en worden in Dag 2-3 ingevuld.
