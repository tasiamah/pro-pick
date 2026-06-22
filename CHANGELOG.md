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

### Changed
- Standardized on Python 3.11 (CI, Docker, `pyproject.toml`,
  `.python-version`).
- Backend startup uses Alembic migrations instead of `create_all` at runtime.
- Docker Compose database credentials parameterized via environment variables.
- `.env.example` uses explicit localhost CORS origins instead of a wildcard.

[Unreleased]: https://github.com/tasiamah/pro-pick/commits/main
