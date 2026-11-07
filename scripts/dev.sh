#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PID=""
cleanup() {
  if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    kill "${BACKEND_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if [[ ! -x "${ROOT}/backend/.venv/bin/uvicorn" ]]; then
  echo "Backend virtualenv missing. Run: make setup"
  exit 1
fi
if [[ ! -d "${ROOT}/frontend/node_modules" ]]; then
  echo "Frontend dependencies missing. Run: make setup"
  exit 1
fi

echo "Starting TerraPulse API on http://localhost:8000 ..."
(cd "${ROOT}/backend" && .venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000) &
BACKEND_PID=$!
sleep 3
echo "Starting TerraPulse frontend on http://localhost:3000 ..."
(cd "${ROOT}/frontend" && pnpm dev)
