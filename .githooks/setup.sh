#!/usr/bin/env bash
#
# One-time setup: point git at the repo's shared hooks.
# Run this once after cloning:
#   ./.githooks/setup.sh

set -e

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

git config core.hooksPath .githooks
chmod +x .githooks/pre-push

echo "✅ Git hooks enabled. Direct pushes to 'main' are now blocked locally."
