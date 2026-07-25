# ARCHITECTURE.md

## Status

This file starts as a target architecture plus a place to record actual repository reality.
Do not leave aspirational statements here without labeling them clearly.

Use these labels:
- ACTUAL:
- TARGET:
- GAP:

## Target architecture summary

The platform is a multi-tenant SaaS system for actor-based web automation.

### Main subsystems
1. Identity and tenancy
2. Actor registry
3. Run orchestration
4. Storage services
5. Scheduling and triggers
6. Console UI
7. Marketplace
8. Billing/metering
9. Admin/audit/security
10. External integrations

## Core concepts

- User
- Organization
- Workspace
- Membership
- Actor
- ActorVersion
- ActorRun
- Dataset
- DatasetItem
- KeyValueStore
- KeyValueRecord
- RequestQueue
- RequestQueueItem
- Schedule
- Webhook
- ApiToken
- Plan
- UsageRecord
- AuditEvent
- MarketplaceListing
- Subscription

## Suggested service boundaries

### 1. Identity service
Responsibilities:
- authentication
- user profile
- memberships
- role checks

### 2. Workspace service
Responsibilities:
- organization/workspace scoping
- tenant boundaries
- workspace settings

### 3. Actor service
Responsibilities:
- actor CRUD
- versioning
- schema metadata
- publication state

### 4. Run service
Responsibilities:
- run creation
- state transitions
- logs
- retries
- cancellation
- execution metadata

### 5. Execution worker
Responsibilities:
- dequeue jobs
- invoke runtime
- persist run state
- collect artifacts and logs
- enforce execution boundaries

### 6. Storage service
Responsibilities:
- datasets
- key-value storage
- request queues
- export/read APIs

### 7. Automation service
Responsibilities:
- schedules
- cron resolution
- trigger dispatch
- webhook ingestion/emission

### 8. Billing service
Responsibilities:
- usage accounting
- plan enforcement
- subscription state

### 9. Marketplace service
Responsibilities:
- listings
- discoverability
- publication metadata
- future monetization hooks

### 10. Audit/admin service
Responsibilities:
- audit events
- privileged operations
- platform visibility

## Run lifecycle target

A run should move through explicit states, for example:
- CREATED
- QUEUED
- STARTING
- RUNNING
- SUCCEEDED
- FAILED
- ABORTING
- ABORTED
- TIMED_OUT

Transitions must be controlled and logged.

## Storage target

Inspired by actor-platform storage patterns, the system should expose:
- datasets for structured output rows
- key-value stores for config/files/intermediate values
- request queues for crawl/task progression [web:1]

## Scheduling target

The platform should support recurring execution via schedules and API-driven runs, reflecting the common actor workflow of start, wait, and retrieve outputs asynchronously. [web:44][web:48][web:51]

## Security target

- all data tenant-scoped
- authn/authz enforced server-side
- sensitive actions audited
- execution isolation documented
- API tokens scoped and revocable

## Actual repository notes

### ACTUAL:
- Node.js + TypeScript project initialized with pnpm.
- Git repository initialized (first commit b128a58, 26 files).
- ROOT: LOOP.md, VERIFIER.md, FIRST_LOOP_PROMPT.md, package.json, tsconfig.json, eslint.config.js, .prettierrc, vitest.config.ts, .gitignore, .env, .env.example, src/, test/, prisma/, project-docs/.
- Tooling: TypeScript 5.9, ESLint 9.39, Vitest 3.2, Prettier 3.9, Prisma 6.19.3, Hono 4.12, tsx 4.23.
- Runnable commands: `pnpm dev` (hot-reload), `pnpm start`, `pnpm build`, `pnpm lint` (pass), `pnpm typecheck` (pass), `pnpm test` (pass), `pnpm prisma:validate` (pass), `pnpm prisma:generate` (pass).
- Schema (16 models, 2 enums):
  - Tenancy: User, Organization, Membership (MembershipRole), Workspace, WorkspaceMembership
  - Execution: Actor, ActorVersion, ActorRun (ActorRunStatus)
  - Storage: Dataset, DatasetItem, KeyValueStore, KeyValueRecord, RequestQueue, RequestQueueItem
  - Automation: Schedule
  - Identity: ApiToken
- Backend: Hono HTTP server on configurable PORT, GET /health endpoint returning structured JSON with graceful DB-disconnected handling.
- POST /runs endpoint created with Zod input validation, workspace-scoped access check, ActorRun creation with status PENDING.
- CI: .github/workflows/ci.yml — lint, typecheck, test on push/PR to main. ubuntu-latest, Node 22, pnpm 11.13.1, frozen lockfile, pnpm cache. No DB/Docker/secrets required.
- Run CRUD: POST /runs (create with Zod validation, workspace-scoped access), GET /runs/:id (lookup by ID), GET /workspaces/:workspaceId/runs (list with cursor pagination, limit 1-100).
- Schedule CRUD: POST /schedules (create with Zod + cron validation, workspace-scoped access), GET /schedules/:id (lookup by ID), GET /workspaces/:workspaceId/schedules (list with cursor pagination, limit 1-100).
- Auth: ApiToken model (SHA-256 hashed tokens), requireAuth middleware on /runs/*, /workspaces/*, /schedules/*. /health remains public. Bearer token extractor + hash lookup flow. VITEST bypass for test mode.
- Workspace membership: WorkspaceMembership model (unique [userId, workspaceId]), assertWorkspaceMember() helper called by every workspace-scoped route handler. POST/GET deny returns 403 {"error":"Forbidden: not a member of this workspace"}.
- **RBAC layer:**
  - WorkspaceRole type: OWNER, ADMIN, MEMBER with validation (isValidWorkspaceRole)
  - getWorkspaceRole() fetches role from DB
  - requireWorkspaceRole(allowedRoles) middleware factory
  - requireWorkspaceOwner() convenience middleware
  - **Route-level role gates:**
    - Workspace settings: PATCH → OWNER/ADMIN
    - Member management: POST (add) → OWNER/ADMIN, but OWNER-only to assign OWNER role; PATCH (change role) → OWNER-only; DELETE (remove) → OWNER-only
    - Actor CRUD: POST → OWNER/ADMIN/MEMBER (sets ownerId); PATCH → OWNER/ADMIN/MEMBER + ownership check; DELETE → OWNER/ADMIN/MEMBER + ownership check
    - API tokens: GET/POST (create) → OWNER/ADMIN; revoke → OWNER/ADMIN
  - Read endpoints (GET workspace, list members, list actors, get actor) accessible to any workspace member
  - All deny responses return consistent 403 {"error":"Forbidden: insufficient permissions"}
  - **Actor ownership model:** Creator becomes owner (ownerId on Actor model). OWNER/ADMIN manage any actor; MEMBER can only manage actors they own. Pure function canUserManageActor() unit-tested without VITEST bypass. assertActorManageAccess() middleware under VITEST bypass for route-level tests.
- 93 tests across 7 files (index.test.ts, runs.test.ts, schedules.test.ts, auth.test.ts, workspace-auth.test.ts, role-auth.test.ts, actor-auth.test.ts).

### ACTUAL: Storage authorization — asymmetric model
- Dataset, KeyValueStore, and RequestQueue use an **asymmetric authorization model**:
  - **Read/list/get**: allowed for all workspace members (no ownership gate)
  - **Create resource** (POST / on collection): allowed for all workspace members; the creator is recorded as `ownerId`
  - **Mutate/write/delete** (POST items, DELETE resource): gated by ownership — OWNER/ADMIN bypass the check, MEMBER can only mutate resources they own (`ownerId === userId`)
- Enforcement is done via `assertStorageManageAccess()` in `src/storage-auth.ts`, which delegates to `canUserManageActor()` from `src/actor-auth.ts`
- Currently gated mutation endpoints:
  - `DELETE /:datasetId` (dataset)
  - `POST /:datasetId/items` (dataset item creation)
  - `DELETE /:storeId` (key-value store)
  - `DELETE /:queueId` (request queue)
- This is the default storage authorization model. Any new storage endpoints or sub-resource mutation endpoints should follow the same pattern.
- Design rationale: storage resources are often shared team assets (everyone reads results), but mutation rights should follow ownership unless the user is an admin/owner of the workspace.

### Available tooling:
- Node.js v25.8.2
- npm 11.12.0
- pnpm 11.13.1
- Git 2.54.0
- Docker: not installed

### TARGET:
- Multi-tenant modular SaaS platform as described above.

### GAP:
- Foundation scaffolding, execution-domain schema, structured storage models, backend app shell, health endpoint, run CRUD (create, read, list), schedule CRUD (create, read, list), auth middleware, workspace membership middleware, workspace-scoped RBAC, and CI baseline are in place (16 models, Hono HTTP server, POST/GET runs + schedules, requireAuth on protected routes, assertWorkspaceMember + requireWorkspaceRole on all workspace-scoped handlers, .github/workflows/ci.yml).
- No Docker, no OAuth, no update/delete endpoints for existing resources, no frontend yet.
- Full platform remains aspirational.
- Next gap: schedule stale recovery (orphaned schedules from claim-and-crash), run cancellation API, execution sandbox isolation.
