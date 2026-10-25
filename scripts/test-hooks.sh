#!/bin/bash
set -euo pipefail
# Validation only; installation configures hooks for this repository.
[ "$(git config core.hooksPath)" = '.githooks' ] || {
  echo 'Run node scripts/setup-git-hooks.mjs from the CarbonNode checkout first.'
  exit 1
}
[ -x '.githooks/pre-commit' ] || { echo 'Missing executable pre-commit hook'; exit 1; }
echo 'Git hooks configuration is valid.'
