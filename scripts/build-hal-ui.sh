#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "Building HAL UI..."
mkdir -p src/web/hal-ui/dist
node_modules/.bin/esbuild src/web/hal-ui/main.ts \
  --bundle \
  --outdir=src/web/hal-ui/dist \
  --format=iife \
  --sourcemap \
  --target=chrome120
echo "HAL UI built successfully."
