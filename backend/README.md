# Backend

Python **FastAPI** service for AI assistant, document RAG, and **PostgreSQL database** (Prisma).

## Includes

### AI / RAG
- **Chat API:** `/api/v1/chat` — ask questions over company docs
- **Documents:** upload, chunk, embed, index
- **LLM:** Groq (cloud) or Ollama (local)
- **Vectors:** Pinecone or local store

### Database (Prisma)
- `prisma/schema.prisma` — all tables (users, courses, quizzes, progress, etc.)
- `prisma/migrations/` — SQL migration history
- `prisma/seed.ts` — demo users and sample content

## Run AI service

```bash
cd backend
bash scripts/dev.sh
# → http://localhost:8000
# → http://localhost:8000/docs (API docs)
```

Or from repo root: `npm run dev:rag`

## Database commands (from repo root)

```bash
npm run db:migrate      # Apply migrations (dev)
npm run db:migrate:deploy  # Production migrations
npm run db:seed         # Seed demo data
npm run db:studio       # Visual DB browser
npm run db:generate     # Regenerate Prisma client for frontend
```

Prisma config: `backend/prisma.config.ts`

## Key paths

| Path | What |
|------|------|
| `app/api/v1/` | REST endpoints |
| `app/services/rag_service.py` | RAG pipeline |
| `app/core/database.py` | SQLAlchemy Postgres connection |
| `prisma/schema.prisma` | Database schema |
| `Dockerfile` | Docker deploy |

## Env

Loads `.env` from repo root (`FINAL/.env`).

Required:
```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

Set `ALLOWED_ORIGINS` to your frontend URL in production.

## Deploy

Render / Railway → use `backend/` folder + `Dockerfile`.

Run migrations before deploy: `npm run db:migrate:deploy`
