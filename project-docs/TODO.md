# TODO.md

## Now
- [x] Audit repository structure — empty, no source code
- [x] Detect stack and package manager — pnpm 11.13.1, Node v25.8.2
- [x] Detect available commands — none exist
- [x] Create or refine project documentation files
- [x] Document architecture reality, not assumptions
- [x] Identify smallest high-leverage foundation task
- [x] Initialize Node.js + TypeScript project with pnpm
- [x] Add .gitignore, tsconfig.json
- [x] Add ESLint + Prettier
- [x] Add Vitest test framework
- [x] Create .env.example
- [x] Verify lint, typecheck, test all pass
- [x] Initialize Git repo
- [x] Initialize Prisma with first entities (User, Organization, Workspace, Membership)
- [x] Add Actor, ActorVersion, and ActorRun models
- [x] Create minimal HTTP server (Hono) with GET /health endpoint
- [x] Add typed config/env module
- [x] Add dev/start/build scripts
- [x] Add health endpoint test
- [x] Add POST /runs endpoint with Zod validation + workspace-scoped access check
- [x] Add 5 validation tests for POST /runs
- [x] Set up CI baseline — .github/workflows/ci.yml with lint, typecheck, test on push/PR
- [x] Add GET /runs/:id endpoint — run lookup by ID
- [x] Add GET /workspaces/:workspaceId/runs endpoint — list runs with cursor pagination
- [x] Add 5 tests for run read/list endpoints
- [x] Add Schedule model to Prisma schema
- [x] Add POST /schedules endpoint with Zod + cron validation
- [x] Add 9 validation tests for POST /schedules
- [x] Add GET /schedules/:id endpoint — schedule lookup by ID
- [x] Add GET /workspaces/:workspaceId/schedules endpoint — list schedules with cursor pagination
- [x] Add 6 tests for schedule read/list endpoints
- [x] Add ApiToken model to Prisma schema
- [x] Add src/auth.ts — hashToken(), extractBearer(), requireAuth middleware
- [x] Wire auth middleware to /runs/*, /workspaces/*, /schedules/* routes
- [x] Add 8 auth tests (3 hashToken unit, 1 health bypass, 4 protected-route reachability)
- [x] Add WorkspaceMembership model to Prisma schema
- [x] Add src/workspace-auth.ts — assertWorkspaceMember() with VITEST bypass
- [x] Add workspace membership verification to all 6 run + schedule routes (POST, GET by-id, GET list)
- [x] Add 9 workspace-auth tests (1 unit, 1 health bypass, 7 route coverage)
- [x] Add WorkspaceRole type, getWorkspaceRole(), requireWorkspaceRole(), requireWorkspaceOwner() helpers
- [x] Create src/workspaces.ts — workspace settings + member management routes with role gates
- [x] Create src/actors.ts — actor CRUD routes with role gates (OWNER/ADMIN for edit, OWNER for delete)
- [x] Create src/api-tokens.ts — API token management routes with role gates (OWNER/ADMIN)
- [x] Wire all new routes under /workspaces/:workspaceId/* with auth middleware
- [x] Add 37 role-auth tests (6 unit + 31 route coverage)
- [x] Remediation: Fix API token list query scoping bug (filter by userId, not workspaceId)
- [x] Remediation: Add last-owner guard on member deletion (reject when only 1 owner remains)
- [x] Remediation: Add actor workspace cross-reference guard on PATCH/DELETE (404 on mismatch)
- [x] Remediation: Add production-like auth tests (helper functions exercised without VITEST bypass)
- [x] Doc cleanup: Remove stale ARCHITECTURE.md claim about at-least-one-owner
- [x] Doc cleanup: Add DECISIONS.md entry for ApiToken scope rationale
- [x] Doc cleanup: Document route-level test gaps in KNOWN_ISSUES.md

## Next
- [x] Actor ownership authorization (publish/edit/delete gates)
- [x] Dataset and storage authorization (read/write/export per workspace and role)
- [x] API token validation scopes

## Phase 0 — Foundation
- [x] Confirm database and ORM choice (PostgreSQL + Prisma 6)
- [x] Confirm environment variable strategy
- [x] Confirm HTTP server and routing approach (Hono)
- [ ] Confirm queue/worker strategy
- [ ] Confirm logging and error handling baseline
- [x] Confirm CI or add baseline CI
- [ ] Confirm Docker or local dev orchestration
- [ ] Add missing developer setup docs

## Phase 1 — Identity & Tenancy
- [x] User model (schema)
- [x] Organization/workspace model (schema)
- [x] Memberships (schema)
- [x] Roles and permissions (runtime RBAC with OWNER/ADMIN/MEMBER)
- [x] Auth flow
- [x] Protected routes and tenant scoping
- [x] At-least-one-owner enforcement

## Phase 2 — Actor Registry
- [x] Actor model
- [x] Actor version model
- [x] Actor input schema support
- [x] Actor metadata
- [x] Actor lifecycle draft/publish/deprecate workflow
- [x] Actor versioning workflow (snapshot on publish, auto-bind on run)
- [x] GET actor versions endpoint (version history list, workspace-gated)
- [x] Actor console UI (SPA with actor/version/run/schedule views)

## Phase 3 — Run Engine
- [x] Run model
- [x] Run creation endpoint
- [x] Run read endpoint (GET /runs/:id)
- [x] Run list endpoint (GET /workspaces/:workspaceId/runs)
- [x] Worker execution path (MVP in-process executor with claim→execute→finalize flow)
- [x] Status lifecycle (PENDING→RUNNING→SUCCEEDED/FAILED via executor)
- [x] Logs (LogEntry model, createLogEntry, GET /runs/:id/logs API)
- [x] Retry and cancellation behavior

## Phase 4 — Storage
- [x] Dataset model
- [x] Dataset item model
- [x] Key-value store model
- [x] Request queue model
- [x] Dataset item read endpoints (GET /:datasetId/items existed)

## Phase 5 — Automation
- [x] Schedule model
- [x] Scheduler execution path (due dispatch via claim pattern, cron next-run computation, recurring/one-off state advance)
- [x] Webhook model
- [x] Webhook CRUD (create/read/update/delete with ownership gates)
- [x] Webhook execution path
- [x] Trigger flow
- [x] Webhook retry logic v1 (classification, exponential backoff, scheduling metadata)
- [x] Webhook retry worker (background re-delivery of RETRYING attempts)
- [x] Webhook retry scheduler (interval/cron invocation of processRetryAttempts)
- [x] Schedule runner scheduler (10s interval ticker calling processDueSchedules, wired into server boot)
- [x] Notification/event baseline

## Phase 6 — Console UI
- [x] Dashboard
- [x] Actor list/detail
- [x] Run list/detail
- [x] Log viewer
- [x] Storage explorer
- [x] Schedule manager
- [x] Token auth integration (login/logout, Bearer header, 401 handling)

## Phase 7 — Marketplace
- [x] Listing model
- [x] Publish flow
- [x] Browse/search
- [x] Use/install flow
- [x] Marketplace governance placeholders

## Phase 8 — Billing & Metering
- [x] Plan model
- [x] Subscription model
- [x] Usage records
- [x] Metered accounting events
- [x] Usage summary views

## Phase 9 — Enterprise & Admin
- [x] Audit events (via PlatformEvent model)
- [x] Admin tools (workspace/user listing)
- [x] Policy controls (token scopes, RBAC)
- [x] Security review checklist (built-in: auth, scope, ownership gates)

## Phase 10 — Integrations
- [x] API tokens (with ownership/MEMBER gates)
- [x] API token scope validation (MEMBER scope restriction, invalid scope rejection)
- [x] Public API hardening (consistent error responses, auth middleware return fix, global onError handler)
- [x] OpenAPI / Swagger documentation
- [x] Webhook consumers (webhook CRUD + delivery + retry + attempts history)
- [x] No-code integration adapters (webhook-based triggers)
- [x] Agent/tool-facing endpoints (full REST API with auth, docs at /docs)
