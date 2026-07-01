#!/usr/bin/env bash
# Deploy backend to Render via Blueprint and wire Vercel env vars.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="$PATH:$HOME/.local/bin:${ROOT}/frontend/.tools/node-v22.14.0-darwin-arm64/bin"

FRONTEND_URL="${FRONTEND_URL:-https://frontend-kharesiya.vercel.app}"
BACKEND_URL="${BACKEND_URL:-https://kharesiya-rag.onrender.com}"

echo "==> Frontend URL: $FRONTEND_URL"
echo "==> Backend URL:  $BACKEND_URL"
echo

if ! command -v render >/dev/null 2>&1; then
  echo "Installing Render CLI..."
  curl -fsSL https://raw.githubusercontent.com/render-oss/cli/refs/heads/main/bin/install.sh | sh
  export PATH="$PATH:$HOME/.local/bin"
fi

if ! render services -o json --confirm >/dev/null 2>&1; then
  echo "Log in to Render (browser will open):"
  render login
  render workspace set
fi

echo "==> Validating render.yaml"
render blueprints validate render.yaml

echo
echo "==> Create Blueprint in Render Dashboard if not done yet:"
echo "    https://dashboard.render.com/blueprints"
echo "    Repo: harshoyobaby-ship-it/knowledge-hub | Branch: main"
echo
echo "==> Required env vars for kharesiya-rag service:"
echo "    ALLOWED_ORIGINS=$FRONTEND_URL"
echo "    (plus DATABASE_URL, DIRECT_URL, JWT_SECRET, GROQ_API_KEY, PINECONE_API_KEY from .env)"
echo

read_env() {
  local key="$1"
  grep -E "^${key}=" "$ROOT/.env" | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//'
}

for key in DATABASE_URL DIRECT_URL JWT_SECRET GROQ_API_KEY PINECONE_API_KEY PINECONE_INDEX_NAME; do
  value="$(read_env "$key" || true)"
  if [ -n "$value" ]; then
    echo "    Setting $key on Render..."
    render env set "$key" "$value" --service kharesiya-rag --confirm 2>/dev/null || true
  fi
done

render env set ALLOWED_ORIGINS "$FRONTEND_URL" --service kharesiya-rag --confirm 2>/dev/null || true

echo
echo "==> Triggering deploy"
render deploys create kharesiya-rag --wait --confirm -o text || {
  echo "Service not found yet — deploy via Blueprint first, then re-run this script."
  exit 1
}

echo
echo "==> Updating Vercel RAG_SERVICE_URL"
printf '%s' "$BACKEND_URL" | vercel env add RAG_SERVICE_URL production --force 2>/dev/null || true

echo
echo "Done. Backend: $BACKEND_URL/health"
