#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export PYTHONPATH=.

if [ ! -d .venv ]; then
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt
else
  source .venv/bin/activate
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env — update PINECONE_API_KEY if using Pinecone in production."
fi

echo "Checking Ollama models..."
if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama not found. Install from https://ollama.com/download"
  exit 1
fi

for model in nomic-embed-text qwen3:8b; do
  if ! ollama list | grep -q "$model"; then
    echo "Pulling $model (first run may take several minutes)..."
    ollama pull "$model"
  fi
done

if grep -q '^VECTOR_STORE=pinecone' .env 2>/dev/null; then
  echo "Checking Pinecone connection..."
  python scripts/check_pinecone.py || {
    echo ""
    echo "Pinecone check failed. Set PINECONE_API_KEY in .env (from https://app.pinecone.io)"
    exit 1
  }
fi

echo ""
echo "Starting Kharesiya Knowledge AI at http://localhost:8000/bot"
exec uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
