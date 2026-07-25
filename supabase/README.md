# Supabase Setup Guide

## Order of Operations

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your project password and region.
3. Wait for the database to provision (~2 minutes).

### 2. Get your connection strings

From Supabase Dashboard → Project Settings → Database:

- **Pooled URL** (for runtime): `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:6543/postgres?pgbouncer=true`
- **Direct URL** (for migrations): `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`

### 3. Configure environment variables

#### Local `.env` file:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
```

#### Vercel Environment Variables:

| Variable | Value | Environments |
|----------|-------|-------------|
| `DATABASE_URL` | Pooled Supabase URL (port 6543, `?pgbouncer=true`) | Production, Preview, Development |
| `DIRECT_URL` | Direct Supabase URL (port 5432) | Production, Preview, Development |
| `NODE_ENV` | `production` | Production |

After adding variables in Vercel, redeploy each environment.

### 4. Run migrations

Use Prisma migrations (preferred):

```bash
npx prisma generate
npx prisma migrate deploy
```

### 5. SQL Editor bootstrap (alternative to migrations)

If you prefer the Supabase SQL Editor:

1. Open Supabase Dashboard → SQL Editor.
2. Paste and run `supabase/01_schema.sql` to create all tables, enums, and indexes.
3. Paste and run `supabase/02_seed.sql` to insert development seed data.

**Note:** API tokens require SHA-256 hashing and cannot be pre-created via SQL. Use the Prisma seed script instead:

```bash
npx tsx seed.ts
```

### 6. Verify deployment

```
GET https://your-app.vercel.app/health
GET https://your-app.vercel.app/openapi.json
GET https://your-app.vercel.app/docs
GET https://your-app.vercel.app/console
```

## Connection types

| URL | Port | Pooled | Use |
|-----|------|--------|-----|
| `DATABASE_URL` | 6543 | Yes (PgBouncer) | Runtime / serverless functions |
| `DIRECT_URL` | 5432 | No | Migrations (`prisma migrate deploy`) |

- The pooled connection (6543) prevents connection exhaustion from serverless function scaling.
- The direct connection (5432) is required for schema migrations because PgBouncer does not support prepared transactions.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `Can't reach database server` | Wrong URL or IP blocked | Check Supabase dashboard for connection strings; enable IPv4 |
| `relation does not exist` | Migrations not run | Run `npx prisma migrate deploy` |
| `too many connections` | Serverless without pooler | Use port 6543 with `?pgbouncer=true` |
| `password authentication failed` | Wrong password | Reset in Supabase Dashboard → Database Settings |
