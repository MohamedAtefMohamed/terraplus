#!/usr/bin/env bash
# Sync backend/ source into serverless/ for the Vercel serverless deployment.
set -euo pipefail
cd "$(dirname "$0")"

rm -rf ../serverless/app
cp -r ../backend/app ../serverless/app
cp ../backend/requirements.txt ../serverless/requirements.txt

find ../serverless -name "__pycache__" -type d -prune -exec rm -rf {} +
echo "serverless/ synced from backend/"
