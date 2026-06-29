# Kharesiya Knowledge Hub

Enterprise learning and knowledge management platform built with Next.js, Prisma, and **Supabase PostgreSQL**.

This app lives inside the monorepo at `knowledge-hub/`. The RAG assistant service is at `services/rag/`. **All environment variables are in `.env` at the repository root** (one level up).

## Database — Supabase Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **Project Settings → Database → Connection string**.
3. Copy credentials into `../.env` (see `../.env.example`):

| Variable | Where to get it | Purpose |
|----------|----------------|---------|
| `DATABASE_URL` | Connection string → **Transaction** pooler (port **6543**) | App runtime (Vercel / serverless) |
| `DIRECT_URL` | Connection string → **Session** pooler (port **5432**) | Prisma migrations |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL | Supabase client |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API → Publishable key | Client-side Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role | Server-side admin ops |

4. Install dependencies and push the schema:

```bash
npm install
cp ../.env.example ../.env   # from repo root, fill in Supabase values
npm run db:push        # create tables in Supabase
npm run db:seed        # optional demo data
```

5. Open Prisma Studio against your Supabase DB:

```bash
npm run db:studio
```

### Vercel deployment

Add the same environment variables in your Vercel project settings. Use the **pooled** `DATABASE_URL` (port 6543) for production.

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

- **Frontend:** Next.js 15+ (App Router), TypeScript, Tailwind CSS, ShadCN UI
- **Database:** Supabase (PostgreSQL) via Prisma ORM
- **Auth:** JWT with role-based access control
- **State:** React Query, React Hook Form, Zod
# knowledge-hub
