#!/usr/bin/env bash
# Release step: apply any pending database migrations before a new version
# goes live. Use this as the Render "Pre-Deploy Command" so production never
# runs against an out-of-date schema:
#
#   bash backend/scripts/release.sh   # from the repo root
#   bash scripts/release.sh           # when the service root is backend/
#
# It is safe to run repeatedly: `alembic upgrade head` is a no-op when the
# database is already current.
set -euo pipefail

cd "$(dirname "$0")/.."

alembic upgrade head
