# Data and odds provider decision (PP-34)

This document compares API-Football, Sportmonks, and Opta for Pro Pick's data
pipeline. It records the chosen provider and expected costs for MVP development
and early production.

Prices and limits below come from each vendor's public pricing pages (June 2026)
and may change. Confirm current plans before purchasing.

## Requirements

Pro Pick needs a single provider that can supply:

- Fixtures and results for selected leagues (teams, competitions, kickoff, status)
- Pre-match 1X2 odds from multiple bookmakers (for value-bet comparison)
- A self-serve signup path suitable for MVP and Epic 2 development
- REST/JSON access from the FastAPI backend

## Comparison

| Criterion | API-Football (api-sports.io) | Sportmonks | Opta (Stats Perform) |
|-----------|------------------------------|------------|----------------------|
| **Public pricing** | Yes — [pricing](https://www.api-football.com/pricing) | Yes — [plans](https://www.sportmonks.com/football-api/plans-pricing/) | No — enterprise sales only |
| **Free / entry tier** | $0 — 100 requests/day, all endpoints (season history limited on free) | 14-day trial on paid plans; free tier limited to 2 fixed leagues | Not available for self-serve |
| **Typical MVP cost** | $0 (dev) → **$19/mo Pro** (7,500 req/day) when scaling | **€29/mo Starter** (5 leagues) + **€14–69/mo odds add-on** + optional **€129/mo premium odds** | Custom (typically high five/low six figures annually for commercial use) |
| **League coverage** | 900+ leagues; all competitions on every plan | 2,300+ leagues; count gated by plan tier | Very broad; broadcast-grade |
| **Fixtures & results** | Yes (`/fixtures`, livescore, standings) | Yes (core product) | Yes |
| **Pre-match odds** | Included on all plans (`/odds`) | Standard odds add-on required; premium feed extra | Available via commercial data packages |
| **Integration fit** | Already used in `FootballApiClient`; header `x-apisports-key` | Different API shape; official SDKs available | Bespoke feeds, contracts, legal review |
| **Best for Pro Pick MVP** | **Strong** — low cost, odds included, code already started | Moderate — costs stack with leagues + odds add-ons | Poor — overkill and no public pricing |

## Decision

**Chosen provider: API-Football (API-Sports).**

### Rationale

1. **Cost for MVP** — The free plan (100 requests/day) is enough for Epic 2
   development and early ingestion tests. Paid tiers start at $19/month without
   mandatory odds add-ons.
2. **Odds included** — Pre-match odds are available on the same API and plan as
   fixtures. Sportmonks treats odds as a separate paid add-on (and premium odds
   as a second tier).
3. **Coverage** — Major European leagues (for example Premier League, La Liga,
   Serie A, Bundesliga, Ligue 1) are available without negotiating enterprise
   contracts.
4. **Existing integration** — The backend already configures
   `FOOTBALL_API_BASE_URL` and `FOOTBALL_API_KEY`, and
   `app/services/data_ingestion.py` implements fixture and odds calls against
   `https://v3.football.api-sports.io`.
5. **Opta ruled out** — Stats Perform / Opta targets large media and betting
   operators with custom contracts. It does not match a student/MVP budget or
   self-serve workflow.

### Why not Sportmonks?

Sportmonks is a solid alternative when you need many niche leagues or premium
odds depth. For Pro Pick's initial scope (a focused league set + 1X2 odds),
total cost rises quickly: base plan + odds add-on (+ optional premium feed),
whereas API-Football includes odds on the base subscription.

### Why not Opta?

Industry-standard data quality, but no public pricing, long sales cycles, and
costs far above MVP needs. Revisit only if the product moves to regulated
commercial betting at scale.

## Cost plan for Pro Pick

| Phase | Plan | Estimated cost | Notes |
|-------|------|----------------|-------|
| **Now (Epic 2 dev)** | API-Football Free | **$0/month** | 100 requests/day; optimize calls in PP-48+ |
| **Early production** | API-Football Pro | **$19/month** | 7,500 requests/day when daily ingestion + odds exceed free quota |
| **Higher traffic** | API-Football Ultra / Mega | **$29–39/month** | If scheduler and multi-league sync need more headroom |

No provider subscription is required beyond API-Football for the current roadmap.
Supabase and Render hosting are documented separately in `backend/README.md`.

## Configuration

Set in `backend/.env` (never commit secrets):

```env
FOOTBALL_API_BASE_URL=https://v3.football.api-sports.io
FOOTBALL_API_KEY=your-api-sports-key
```

Obtain a key from the [API-Sports dashboard](https://dashboard.api-football.com/).

## References

- [API-Football pricing](https://www.api-football.com/pricing)
- [API-Football documentation](https://www.api-football.com/documentation-v3)
- [Sportmonks football API pricing](https://www.sportmonks.com/football-api/plans-pricing/)
- [Sportmonks standard odds add-on](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/standard-odds-feed)
- [Stats Perform / Opta](https://www.statsperform.com/) (enterprise)

## Next tickets

- **PP-48** — Persist fixtures and odds from API-Football into Supabase
- **PP-49** — Historical and upcoming import jobs
- **PP-50** — Daily scheduler
