# Tasks Manager API

Reusable Hono + Better Auth + Drizzle backend for personal task managers (Cloudflare Workers).

## Setup

```bash
pnpm install
cp .env.example .env
# fill DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL
# optional: RESEND_API_KEY, RESEND_FROM_EMAIL for email notifications
pnpm db:migrate
pnpm dev
```

- API docs: `http://localhost:8787/scalar`
- OpenAPI JSON: `http://localhost:8787/docs`
- Auth: `/api/auth/*` (Better Auth email/password)

Canonical runtime is **Cloudflare Workers** (`wrangler` → `src/app.ts`). `src/index.ts` is an optional Node entry for local debugging only.

Hourly cron (`0 * * * *`) sends due-soon notifications (in-app + email via Resend when configured).

Until a Resend domain is verified, use `RESEND_FROM_EMAIL=onboarding@resend.dev` (test sends only to your Resend account email).

## Database

```bash
pnpm db:generate  # create migration from schema
pnpm db:migrate   # apply migrations
pnpm db:push      # push schema without migration files
pnpm db:studio    # Drizzle Studio
```

## Domains

- **Tasks** — ownership/assignee, status/priority/dueDate, recurrence, pagination, filters, labels, soft archive
- **Checklist** — sub-items under a task
- **Comments** — discussion on a task (+ notify owner/assignee)
- **Projects** — task containers
- **Labels** — per-user tags
- **Notifications** — in-app feed + optional Resend emails
- **Auth** — Better Auth sessions (cookie)
