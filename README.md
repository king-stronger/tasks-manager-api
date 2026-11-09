# Tasks Manager API

Reusable Hono + Better Auth + Drizzle backend for personal task managers (Cloudflare Workers).

## Setup

```bash
pnpm install
cp .env.example .env
# fill DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL
pnpm db:migrate
pnpm dev
```

- API docs: `http://localhost:8787/scalar`
- OpenAPI JSON: `http://localhost:8787/docs`
- Auth: `/api/auth/*` (Better Auth email/password)

Canonical runtime is **Cloudflare Workers** (`wrangler` → `src/app.ts`). `src/index.ts` is an optional Node entry for local debugging only.

## Database

```bash
pnpm db:generate  # create migration from schema
pnpm db:migrate   # apply migrations
pnpm db:push      # push schema without migration files
pnpm db:studio    # Drizzle Studio
```

## Domains

- **Tasks** — CRUD with ownership, status/priority/dueDate, pagination, filters, search, soft archive, labels
- **Projects** — task containers with ownership and soft archive
- **Labels** — per-user tags, many-to-many with tasks
- **Auth** — Better Auth sessions (cookie)
