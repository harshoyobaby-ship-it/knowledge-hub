#!/usr/bin/env bash
set -euo pipefail

RAG_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$RAG_ROOT/../.." && pwd)"

cd "$RAG_ROOT"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q -r requirements.txt

if [ ! -f "$ROOT/.env" ]; then
  echo "Missing $ROOT/.env — copy .env.example to .env and configure it."
  exit 1
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
