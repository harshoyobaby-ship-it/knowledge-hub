# Config

Shared configuration templates and Docker setup.

## Files

| File | Purpose |
|------|---------|
| `.env.example` | Template for all environment variables |
| `docker-compose.yml` | RAG + Redis + Ollama (optional) |

## Setup

```bash
cp config/.env.example .env
# Edit .env at repo root with your keys
```

## Docker (optional)

From this folder:

```bash
cd config
docker compose up rag redis
```

Uses `../backend` for the RAG image and `../.env` for secrets.

## Env sections

- **Supabase** — database URLs
- **JWT** — auth secret
- **SMTP** — weekly training emails
- **Groq / Pinecone** — AI backend
- **Storage** — local or S3/Supabase for uploads
