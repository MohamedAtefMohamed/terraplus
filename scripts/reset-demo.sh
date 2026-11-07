#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
rm -rf "${ROOT}/backend/data"
echo "Removed backend/data. The API will regenerate the demo dataset on next startup."
