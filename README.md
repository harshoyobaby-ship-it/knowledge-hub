# Kharesiya Knowledge Platform

Simple monorepo with **3 folders**:

```
FINAL/
├── frontend/     # Next.js web app (UI + API routes)
├── backend/      # Python FastAPI + Prisma database
├── config/       # .env.example, docker-compose
├── .env          # Your secrets (create from config/.env.example)
└── package.json  # Root scripts
```

## Quick start

```bash
# 1. Environment
cp config/.env.example .env
# Edit .env with Supabase, JWT, Groq, Pinecone, SMTP keys

# 2. Install
npm run install:all

# 3. Database
npm run db:migrate
npm run db:seed

# 4. Run (two terminals)
npm run dev:web    # http://localhost:3000
npm run dev:rag    # http://localhost:8000

# Stop both services
npm run stop
```

## What each folder does

| Folder | Tech | Purpose |
|--------|------|---------|
| **frontend** | Next.js 16, React, Tailwind | Login, LMS pages, admin, quizzes, email UI |
| **backend** | Python FastAPI + Prisma/PostgreSQL | AI/RAG service + database schema & migrations |
| **config** | Docker, env template | Shared configuration files |

## Deploy (free)

| Part | Host | Folder |
|------|------|--------|
| Web app | Vercel | `frontend` |
| Database migrations | Supabase | `backend/prisma` |
| AI service | Render | `backend` |

Set `NEXT_PUBLIC_APP_URL` and `RAG_SERVICE_URL` in production `.env`.

## Test logins

- Admin: `admin@kharesiya.com` / `Admin@123456`
- Employee: `employee@kharesiya.com` / `Employee@123456`
