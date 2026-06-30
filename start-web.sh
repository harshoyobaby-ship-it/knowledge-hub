#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
export PATH="$ROOT/frontend/.tools/node-v22.14.0-darwin-arm64/bin:$PATH"
cd "$ROOT/frontend"
# Clear stale Turbopack cache that causes "Next.js package not found" panics
rm -rf .next
cd "$ROOT"
exec npm run dev --prefix frontend
