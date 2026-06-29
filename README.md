# Kharesiya Knowledge Platform

Monorepo for the Kharesiya Knowledge Hub web application and RAG assistant service.

## Project structure

```
.
├── .env                    # Single environment file (all apps)
├── .env.example            # Template — copy to .env
├── docker-compose.yml      # RAG + Redis + Ollama
├── package.json            # Root scripts
├── knowledge-hub/          # Next.js web app (auth, LMS, dashboard)
│   ├── src/
│   └── prisma/
└── services/
    └── rag/                # FastAPI RAG microservice (Ollama, Pinecone)
```

## Quick start

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your Supabase, JWT, Groq, and Pinecone keys

# 2. Install dependencies
npm run install:all

# 3. Apply database migrations
npm run db:migrate

# 4. Run both services (separate terminals)
npm run dev:web    # http://localhost:3000
npm run dev:rag    # http://localhost:8000
```

Or from the repo root:

```bash
npm run dev        # Knowledge Hub only
```

## Environment

All configuration lives in **one file**: `.env` at the repository root.

| Section | Used by |
|---------|---------|
| `DATABASE_URL`, `DIRECT_URL`, Supabase keys | Knowledge Hub (Prisma) + RAG (SQLAlchemy) |
| `JWT_SECRET` | Knowledge Hub auth + RAG JWT validation |
| `RAG_SERVICE_URL` | Knowledge Hub → RAG proxy |
| `OLLAMA_*`, `GROQ_*`, `PINECONE_*` | RAG service |

## Docker

```bash
docker compose up rag redis
docker compose --profile ollama up   # include Ollama
```

## Legacy

The standalone `kharesiya-rag/` folder has been merged into `services/rag/`. Do not use it.
