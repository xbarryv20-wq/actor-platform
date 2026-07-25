# Actor Platform

A production-minded cloud platform for actor-based web automation and data extraction.

## Quick start

### Supabase (recommended)

```bash
pnpm install
cp .env.example .env
# Fill in DATABASE_URL (pooled, port 6543) and DIRECT_URL (direct, port 5432)
npx prisma generate
npx prisma migrate deploy
npx tsx seed.ts   # creates test user + API token
pnpm run dev
```

### Local PostgreSQL (alternative)

```bash
pnpm install
cp .env.example .env
# Set DATABASE_URL to your local PostgreSQL
pnpm run dev
```

### Windows one-click start

Double-click `startapp.bat` — it starts PostgreSQL, launches the app, and opens the browser.

Login token: `tok_0c61aa547a2d443088963d07`

Double-click `stopapp.bat` to stop.

## Available commands

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start dev server with hot reload |
| `pnpm run start` | Start production server |
| `pnpm run build` | Compile TypeScript to dist/ |
| `pnpm run lint` | Run ESLint on src/ and test/ |
| `pnpm run typecheck` | Run tsc --noEmit |
| `pnpm run test` | Run all tests |

## API documentation

- OpenAPI spec: `GET /openapi.json`
- Swagger UI: `GET /docs`
- Console UI: `GET /console`

## Architecture

The platform is organized around 10 phases:

1. **Identity & Tenancy** — users, workspaces, RBAC (OWNER/ADMIN/MEMBER)
2. **Actor Registry** — actor CRUD, versioning, lifecycle draft/publish/deprecate
3. **Run Engine** — async run execution with child-process isolation, logs, cancellation
4. **Storage** — datasets, key-value stores, request queues with tenant isolation
5. **Automation** — schedules (cron), webhooks with HMAC signing and retry
6. **Console UI** — SPA admin interface (dashboard, actors, runs, schedules, storage, marketplace, billing)
7. **Marketplace** — actor listing, publish/approve/reject flow with governance
8. **Billing** — plans, subscriptions, usage metering (schema ready, enforcement deferred)
9. **Enterprise** — admin workspace/user listing, audit events
10. **Integrations** — API tokens with scope validation, OpenAPI 3.1, webhook consumers

## Tests

```bash
pnpm run test
```

396+ tests across 30 test files. Tests use VITEST bypass for auth middleware — no database required.

## Deployment

### Vercel + Supabase (recommended)

```bash
# 1. Create Supabase project, get pooled (port 6543) and direct (port 5432) URLs
# 2. Set DATABASE_URL and DIRECT_URL in Vercel dashboard
# 3. Push repo to Vercel — build command: npx prisma generate && npx tsc
# 4. Run migrations: npx prisma migrate deploy
# 5. Seed: npx tsx seed.ts
```

### Docker Compose (legacy)

```bash
docker compose up -d
docker compose exec app npx prisma migrate deploy
```

See [DEPLOY.md](DEPLOY.md) for detailed steps.

## Documentation

- [Deploy guide](DEPLOY.md)
- [Architecture](project-docs/ARCHITECTURE.md)
- [API contracts](project-docs/API_CONTRACTS.md)
- [Known issues](project-docs/KNOWN_ISSUES.md)

## License

MIT
