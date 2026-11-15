#!/usr/bin/env bash
# Fail when serverless/app drifts from backend/app (Vercel deploys serverless/).
set -euo pipefail
cd "$(dirname "$0")/.."

drift=0
# Ignore bytecode caches created by local test runs.
list_diff() {
  diff -rq backend/app serverless/app 2>/dev/null \
    | grep -v -E "__pycache__|\.pyc" || true
}

if [ -n "$(list_diff)" ]; then
  echo "serverless/app differs from backend/app:"
  list_diff | head -20
  drift=1
fi
if ! diff -q backend/requirements.txt serverless/requirements.txt >/dev/null 2>&1; then
  echo "serverless/requirements.txt differs from backend/requirements.txt"
  drift=1
fi

if [ "$drift" -ne 0 ]; then
  echo
  echo "Run scripts/sync-serverless.sh and commit the result before pushing."
  exit 1
fi
echo "serverless mirror is in sync with backend"
