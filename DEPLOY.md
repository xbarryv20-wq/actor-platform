# Deploy Guide

## Supabase + Vercel Deploy (Recommended)

```bash
# ─── 1. Create Supabase project, get connection strings ───
#    Pooled:  postgresql://postgres:[PASS]@db.[PROJECT].supabase.co:6543/postgres?pgbouncer=true
#    Direct:  postgresql://postgres:[PASS]@db.[PROJECT].supabase.co:5432/postgres

# ─── 2. Set up Prisma for Supabase ───
#    DATABASE_URL = pooled URL (port 6543)
#    DIRECT_URL   = direct URL (port 5432)

# ─── 3. Run migrations ───
npx prisma generate
npx prisma migrate deploy

# ─── 4. Seed data (optional) ───
npx tsx seed.ts

# ─── 5. Deploy to Vercel ───
#    Import repo in Vercel dashboard, add environment variables:
#    - DATABASE_URL (pooled)
#    - DIRECT_URL   (direct)
#    - NODE_ENV = production
#    Build command: npx prisma generate && npx tsc
#    Output dir: dist

# ─── 6. Verify ───
curl https://your-app.vercel.app/health
curl https://your-app.vercel.app/openapi.json
```

## Docker Compose Deploy (Legacy/Local)

```bash
# ─── 0. Prerequisites ───
# Install: git, Docker + Docker Compose, Node.js 22+, pnpm 11+

# ─── 1. Clone & push to your remote ───
git remote add origin <your-repo-url>
git add -A
git commit -m "v1.0.0 release"
git push origin master
git push origin v1.0.0

# ─── 2. Deploy with Docker Compose ───
docker compose up -d

# ─── 3. Run database migrations ───
docker compose exec app npx prisma migrate deploy

# ─── 4. Verify ───
curl -s http://localhost:3000/health | jq .
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/openapi.json
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/docs
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/console
```

## Environment variables

```bash
# Start PostgreSQL + app
docker compose up -d

# Run database migrations (first time only)
docker compose exec app npx prisma migrate deploy

# Open http://localhost:3000/console
```

## Manual deploy

### 1. Database

```bash
# Create the database
createdb actor_platform

# Run migrations
DATABASE_URL=postgresql://user:pass@localhost:5432/actor_platform npx prisma migrate deploy
```

### 2. Application

```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Start
NODE_ENV=production \
  PORT=3000 \
  DATABASE_URL=postgresql://user:pass@localhost:5432/actor_platform \
  node dist/src/index.js
```

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Set to `production` for deployment |
| `PORT` | No | `3000` | HTTP server port (local only; Vercel ignores) |
| `DATABASE_URL` | **Yes** | — | PostgreSQL pooled connection string (Supabase port 6543 with `?pgbouncer=true`) |
| `DIRECT_URL` | **Yes** | — | PostgreSQL direct connection string for migrations (Supabase port 5432) |

## Database migrations

Before first run:

```bash
npx prisma migrate deploy
```

To create a new migration after schema changes:

```bash
npx prisma migrate dev --name <description>
```

## Health check

```
GET /health
```

Returns `200 OK` with DB connection status.

## API docs

- OpenAPI spec: `GET /openapi.json`
- Swagger UI: `GET /docs`
- Console UI: `GET /console`

## Production notes

- Run behind a reverse proxy (nginx, Caddy) for TLS and rate limiting.
- The `/console` route is the admin SPA — restrict access via the proxy or add auth.
- Webhook delivery uses `fetch()` with 10s timeout — ensure outbound connectivity.
- **Scheduler workers**: webhook retry, run executor, and schedule runner start automatically on boot in local/Docker mode. On Vercel (serverless), they are **disabled** because serverless functions cannot maintain persistent background intervals. Use Vercel Cron Jobs or an external worker for scheduled tasks.
- Use `app.basePath("/api")` in `src/index.ts` if an `/api` prefix is required for your proxy setup.
