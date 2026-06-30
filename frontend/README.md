# Frontend

Next.js web application — **UI + REST API** for the LMS.

## Includes

- **Pages:** login, dashboard, courses, quizzes, SOPs, admin, HR, email automation
- **API routes:** `/api/auth`, `/api/users`, `/api/chapters`, `/api/quizzes`, `/api/cron`, etc.
- **Auth:** JWT cookies, role-based access (Admin, HR, Employee, Trainer…)
- **Email:** weekly training reminders via SMTP

## Run

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

Or from repo root: `npm run dev:web`

## Key paths

| Path | What |
|------|------|
| `src/app/(dashboard)/` | Main UI pages |
| `src/app/api/` | Backend API routes |
| `src/components/` | UI components |
| `src/lib/` | Auth, RBAC, email, storage |
| `vercel.json` | Weekly email cron (deploy on Vercel) |

## Env

Loads `.env` from repo root (`../.env`).

## Deploy

Vercel → set **Root Directory** to `frontend`.
