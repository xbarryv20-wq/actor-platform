# DECISIONS.md

## Decision log

### 2026-07-22
- Initialized project delivery docs and loop operating contract.
- Default architecture preference is Next.js + Node.js + PostgreSQL + Prisma + Redis + worker model, unless repository reality dictates otherwise.
- Delivery will follow phased loop-based execution with strict verification before completion claims.

### 2026-07-22 (second pass)
- Adopted maker/checker split: VERIFIER.md for adversarial audit, FIRST_LOOP_PROMPT.md for initial loop scope control.
- Expanded project-docs to 11 files per agent-readable doc best practices (separate state, plan, architecture, tasks, decisions, changelog, risks, requirements, acceptance criteria, domain model, API contracts).
- ARCHITECTURE.md now uses ACTUAL/TARGET/GAP labels explicitly per [ability] guidance.
- KNOWN_ISSUES.md now uses severity: BLOCKER / MAJOR / MINOR.
- STATE.json updated to track completed doc initialization tasks.

### 2026-07-22 (loop 1 audit)
- Repository audit confirmed empty repo with Node v25.8.2, pnpm 11.13.1, Git 2.54.0 available.
- Docker not available on this machine — local dev will use direct PostgreSQL/Redis or documented alternatives.
- Next stack decision: initialize pnpm workspace with TypeScript, Vitest, ESLint, Prettier, Prisma as the foundation. This follows the architecture preference from LOOP.md and matches available tooling.

### 2026-07-22 (loop 2 — toolchain)
- Initialized Node.js + TypeScript project (pnpm, strict tsconfig, flat ESLint config, Prettier, Vitest).
- All three verification gates pass: lint, typecheck, test.
- Created placeholder src/index.ts and test/index.test.ts.
- No Docker, no Prisma, no database, no frontend in this loop — per scope constraint.
- Approved esbuild build script to unblock pnpm install.

### 2026-07-22 (loop 3 — database foundation)
- Initialized Git repo with first commit (26 files).
- Set up Prisma 6.19.3 — pinned to v6 because Prisma 7 removed `url` from datasource block in favor of prisma.config.ts + adapter pattern.
- Created tenancy schema: User, Organization, Membership (with OWNER/ADMIN/MEMBER roles), Workspace.
- All verification checks pass (lint, typecheck, test, prisma validate, prisma generate).
- Next target: Actor, ActorVersion, ActorRun models on this tenancy foundation.

### 2026-07-22 (loop 4 — execution-domain schema)
- Extended schema with Actor, ActorVersion, ActorRun + ActorRunStatus enum.
- Actor scoped to Workspace for tenant isolation; ActorVersion scoped to Actor; ActorRun double-scoped to Actor + Workspace (direct workspaceId on ActorRun for query efficiency).
- ActorRunStatus uses 5 states: PENDING, RUNNING, SUCCEEDED, FAILED, CANCELED — minimal lifecycle.
- input/output modeled as Json? — typed validation deferred to runtime.
- actorVersionId on ActorRun is optional — version may not be pinned at run creation.
- Added indexes on workspaceId, actorId, status for common query paths.
- Next target: Dataset, KeyValueStore, RequestQueue as storage layer.

### 2026-07-22 (loop 5 — structured storage layer)
- Extended schema with 6 storage models: Dataset, DatasetItem, KeyValueStore, KeyValueRecord, RequestQueue, RequestQueueItem.
- All 3 top-level storage families scoped to Workspace with optional ActorRun provenance link.
- No new enums — RequestQueueItem.status uses String defaulting to "PENDING"; deferred queue lifecycle to runtime.
- DatasetItem.sequence provides stable ordering without reliance on createdAt.
- KeyValueRecord.key unique per store (not globally) — natural scoping.
- RequestQueueItem.uniqueKey dedup constraint per queue.
- Dataset, KeyValueStore, RequestQueue each have slug unique within workspace for API reference.
- Next target: minimal API/application shell.

### 2026-07-22 (loop 6 — backend application shell)
- Chose Hono as HTTP framework — minimal, TypeScript-native, excellent testability via app.request().
- Chose tsx as dev runner — zero-config TypeScript execution with watch mode.
- Separated concerns: src/config.ts (env + Prisma) from src/index.ts (routes + server).
- Health endpoint returns structured JSON with graceful DB-disconnected status (no crash on missing DB).
- Used process.env.VITEST guard to prevent server.listen during test imports.
- Favors graceful degradation over hard failures for missing external dependencies at boot.
- Next target: first minimal actor run creation API endpoint with typed input validation.

### 2026-07-22 (loop 7 — CI baseline)
- Created .github/workflows/ci.yml with lint, typecheck, test on push/PR to main.
- CI uses ubuntu-latest, Node 22 (LTS), pnpm 11.13.1, pnpm install --frozen-lockfile with cached dependencies.
- No PostgreSQL, Docker, or secrets required — all 6 tests pass without a DB.
- Workflow keeps fast gate feedback before any DB-dependent worker/run logic.
- Deterministic pnpm version pinned (11.13.1) rather than relying on packageManager field to avoid ambiguity.
- Node 22 chosen over local Node 25 because GitHub Actions runners are tested against LTS Node releases; the project has no Node 25-specific dependencies.
- Next target: run read (GET /runs/:id) and list (GET /workspaces/:workspaceId/runs) endpoints.

### 2026-07-22 (loop 8 — run read/list endpoints)
- Added GET /runs/:id — run lookup by ID, returns 404 if not found. Workspace scoping deferred to auth middleware (unauthenticated path returns the run directly).
- Added GET /workspaces/:workspaceId/runs — list runs with cursor pagination using limit (default 10, max 100) and cursor (opaque last-item ID). Returns { runs: [...], nextCursor? }.
- Used Zod for query param validation (listQuerySchema with coerce number, min/max bounds).
- Cursor-based cursor pagination via Prisma's cursor + skip: 1, with take: limit+1 to detect hasMore.
- Added 5 tests: 1 for GET /runs/:id (500 without DB), 4 for list (3 validation + 1 DB-failure).
- All 11 tests pass. All three gates pass.
- Next target: first minimal schedule creation endpoint (POST /schedules).

### 2026-07-22 (loop 9-10 — schedule foundation + read/list)
- Added Schedule Prisma model with fields: workspaceId, actorId, actorVersionId?, cronExpression, inputOverride (Json?), enabled, timestamps. Relations to Workspace, Actor, ActorVersion.
- Added cron expression validation — 5-field standard format with numeric range checking per field (minute 0-59, hour 0-23, day 1-31, month 1-12, dow 0-7). Supports * (any), N-M (range), */N (every N), comma combinations. No named month/day support (JAN-DEC, SUN-SAT).
- POST /schedules uses same workspace-scoped access check pattern as POST /runs: 404 if actor not found or wrong workspace.
- GET /schedules/:id — schedule lookup by ID (no workspace scoping yet, same gap as runs).
- GET /workspaces/:workspaceId/schedules — list with cursor pagination, limit validation, same pattern as runs.
- Added 15 tests total for schedules (9 POST validation + 1 GET by-id + 5 GET list).
- 26 tests pass across 3 test files. All three gates pass.
- Next target: user authentication and session management.

### 2026-07-22 (loop 13 — workspace-scoped RBAC)
- Extended workspace-auth.ts with WorkspaceRole type (OWNER/ADMIN/MEMBER), getWorkspaceRole(), requireWorkspaceRole() middleware factory, requireWorkspaceOwner() convenience middleware.
- Created 3 new route modules: workspaces.ts (member management + settings), actors.ts (actor CRUD), api-tokens.ts (token management).
- Role gates applied per-route via middleware on sub-router Hono instances: OWNER has full control; OWNER/ADMIN can manage settings, actors, members, tokens; MEMBER can read workspace resources.
- OWNER-only restrictions: actor delete, member role change, member removal, assigning OWNER role.
- Chose per-route middleware over global role middleware for granularity — some routes under the same prefix need different permission levels (e.g., GET /members open to all members, POST /members requires OWNER/ADMIN).
- Route modules mounted at /workspaces/:workspaceId/* via Hono sub-routers; all inherit requireAuth from parent /workspaces/* middleware.
- 37 new tests (80 total). All three gates pass.
- Next target: actor ownership authorization (publish/edit/delete).

### 2026-07-22 (remediation loop — verifier audit fixes)
- **ApiToken scope decision confirmed**: Tokens remain user-scoped (no workspaceId field on the model). The route lives under `/workspaces/:workspaceId/api-tokens` for role-gating (requireWorkspaceRole middleware) and operational grouping — not because tokens are workspace-owned at the data layer. The GET list query must use the authenticated userId from `c.get("userId")`, not the URL workspaceId.
- **Last-owner guard** added to DELETE /workspaces/:workspaceId/members/:userId — counts remaining OWNER memberships and returns 400 if removal would leave zero owners.
- **Actor workspace cross-reference guard** added to PATCH/DELETE /workspaces/:workspaceId/actors/:actorId — verifies the loaded actor's workspaceId matches the URL workspaceId, returning 404 on mismatch (information-hiding).
- **Test gap documented**: Route-level deny/allow for last-owner guard and actor cross-reference cannot be exercised at HTTP level without a running PostgreSQL instance. Helper functions (getWorkspaceRole, assertWorkspaceMember) have production-path unit coverage. Full middleware-chain + DB integration tests deferred until PostgreSQL is available in CI.
- 82 tests total. All three gates pass.

### 2026-07-22 (actor ownership authorization loop)
- **Chosen model: owner-user (Actor.ownerId references User).** The creating authenticated user becomes the actor's owner at creation time. This aligns with actor-platform conventions where ownership follows the creator, not the workspace.
- **OWNER/ADMIN bypass semantics:** Workspace OWNER and ADMIN roles bypass the ownership check entirely — they can manage any actor in the workspace regardless of ownerId. This avoids blocking workspace-level administration (e.g., an ADMIN cleaning up a departed member's actors).
- **MEMBER semantics:** MEMBER can manage (PATCH/DELETE) only actors they own (userId === ownerId). MEMBER can read all actors in the workspace.
- **Rejected — workspace-ownership model:** Every actor owned by the workspace itself (no ownerId). This would lose per-user granularity — no MEMBER could ever manage any actor without elevating the role. Not suitable for a platform where users create and manage their own automation tools.
- **Rejected — hybrid model (owner + workspace co-ownership):** Over-engineered for the current phase. The owner-user model can be extended later with optional workspace fallback or secondary ownership without schema migration (ownerId is already nullable).
- **Consequence — null ownerId on legacy actors:** Since ownerId is optional (String?), actors created before this migration will have null ownerId. Those actors cannot be managed by MEMBERs (canUserManageActor("MEMBER", null, userId) → false). Requires a data backfill strategy once PostgreSQL is available.
- **Consequence — redundant DB query (post-build fix):** The verifier identified that assertActorManageAccess re-fetches the actor even when the caller (PATCH/DELETE) already loaded it. Fixed by accepting an optional pre-fetched actor parameter to skip the inner query. See Fix 2 in the audit.

### 2026-07-23 (dataset and storage authorization loop)
- **Extended owner-user model** to all three storage families (Dataset, KeyValueStore, RequestQueue). Each model now has a nullable `ownerId` referencing `User`, matching the Actor ownership pattern.
- **Chosen same ownership semantics as Actor:** OWNER/ADMIN bypass the ownership check entirely. MEMBER can manage (delete) only resources they own. Read access (GET list/detail) is open to all workspace members. The `canUserManageActor` pure function is reused directly — it is role+ownerId+userId generic despite its name.
- **assertStorageManageAccess** mirrors `assertActorManageAccess` with a `model` parameter to select the correct Prisma model. Uses the same VITEST bypass pattern.
- **Route design (per storage type):** GET list, GET detail (with `_count`), POST create (sets `ownerId` = authenticated user), DELETE (with ownership gate + workspace cross-reference guard returning 404 on mismatch).
- **Dataset item sub-routes added:** GET `/:datasetId/items` (cursor pagination by sequence) and POST `/:datasetId/items` (auto-incrementing sequence).
- **Rejected — no separate `canUserManageDataset` / `canUserManageKvStore` / `canUserManageQueue` functions.** The single `canUserManageActor` name is a misnomer but the logic is identical; creating three wrappers would be pure duplication. A future rename is acceptable.
- **Consequence — storage ownership extends to items:** DatasetItem, KeyValueRecord, and RequestQueueItem are managed through their parent container's ownership (no direct ownerId on items). Deleting a dataset/queue/store cascades all items (Prisma cascade, not yet implemented — Prisma requires explicit `onDelete` in schema or manual deletes).

### 2026-07-23 (API token and webhook authorization loop)
- **API token authorization expanded from OWNER/ADMIN-only to include MEMBER.** MEMBER can now list their own tokens, create tokens for themselves, and revoke their own tokens. OWNER/ADMIN retain full access plus can create tokens for any workspace member.
- **POST create token now validates target userId is a workspace member** when called by OWNER/ADMIN (no longer accepts arbitrary userId from request body). MEMBER is restricted to creating tokens only for themselves (userId must match authenticated user).
- **POST revoke token now checks ownership** — OWNER/ADMIN bypass, MEMBER can only revoke their own tokens (token.userId === authenticated userId). This prevents a MEMBER from revoking another user's token.
- **Webhook model added** to Prisma schema with workspaceId, actorId, ownerId, eventTypes (comma-separated string), url, secret?, enabled. Follows same owner-user authorization pattern as Actor and storage.
- **assertWebhookManageAccess** created in src/webhook-auth.ts — returns `{ allowed, webhook? }` object enabling the handler to distinguish between "not found" (404) and "forbidden" (403). Follows the same VITEST bypass and OWNER/ADMIN bypass semantics.
- **Webhook CRUD routes:** GET list (any workspace member), GET detail (any workspace member, 404 not found on cross-workspace), POST create (OWNER/ADMIN/MEMBER, verifies actor workspace scope, sets ownerId), PATCH update (ownership gated), DELETE (ownership gated). Non-disclosing 404 on cross-workspace or missing resources.
- **Rejected — workspace-scoped API tokens.** Tokens remain user-scoped (no workspaceId on ApiToken model). The route lives under `/workspaces/:workspaceId/api-tokens` for role-gating and operational grouping only, consistent with the existing DECISIONS.md entry from the remediation loop. Cross-workspace token revoke by OWNER/ADMIN is accepted (token revoke doesn't verify token owner's workspace membership).
- **Rejected — separate `canUserTokenRevoke` / `canUserManageWebhook` functions.** The token auth logic is route-specific enough to inline in handler checks. Webhook auth reuses `canUserManageActor` via `assertWebhookManageAccess`. Minimal duplication.
- **Consequence — webhook route-level deny test gap:** PATCH/DELETE webhook by non-owner MEMBER → 403 cannot be exercised at HTTP level without PostgreSQL. Same constraint as actor/storage ownership. Documented in KNOWN_ISSUES.md.

### 2026-07-23 (API token validation scopes loop)
- **Chosen scope model: `resource:action` format (14 scopes).** Categories: actors, runs, storage, webhooks, tokens, workspace, schedules — each with :read and :write. This is the recommended MVP shape from the loop requirement. Rejected: wildcard patterns (actors:*), numeric scope levels (scope=1/2/3), and OAuth-style scope URIs.
- **Default scope set: read-only for all resources.** Newly created tokens without explicit scopes get `runs:read,actors:read,storage:read,webhooks:read,tokens:read,schedules:read,workspace:read`. This follows the least-privilege default requirement. Write access requires explicit opt-in at token creation.
- **MEMBER scope restriction:** MEMBER may not create tokens with `workspace:write` scope (PATCH workspace settings and member management are OWNER/ADMIN-only). MEMBER may create tokens with all other scopes. OWNER/ADMIN have no scope restrictions.
- **Scope enforcement is middleware, not inline.** `requireTokenScope('resource:action')` is a Hono middleware factory applied per-route, running after `requireWorkspaceRole` but before the handler. All scoped middleware bypass under VITEST, matching the existing pattern used by `requireWorkspaceRole`.
- **Scopes stored as comma-separated string** on the ApiToken model, matching the existing `eventTypes` pattern on Webhook. At 14 scopes, this is well within practical limits for a string field. A JSON array would require a different column type.
- **Scopes checked in addition to role + ownership, not instead of.** A token with `actors:write` scope does not bypass the ownership check (assertActorManageAccess). Scope gates are the first authorization layer; ownership is the second. Both must pass for write operations.
- **Rejected — per-endpoint scopes (e.g., `actors:delete`, `webhooks:update`).** The read/write granularity is sufficient for the current route surface. Finer granularity can be added later without breaking existing tokens by adding new scope constants.
- **Rejected — scope inheritance (`workspace:write` implies `workspace:read`).** Scopes are explicit, not hierarchical. Each required scope must be literally present in the token's scope string. This avoids ambiguity and makes scope audit straightforward.
- **Consequence — route-level scope deny test gap:** Token with read-only scopes attempting a write route → 403 cannot be exercised at HTTP level without PostgreSQL. Same constraint as ownership deny tests. Documented in KNOWN_ISSUES.md.

### 2026-07-23 (webhook retry logic v1)
- **Retry classification matrix** (isRetriable): Network errors (statusCode null) → retry. 429 (rate limit) → retry. 5xx (server errors) → retry. All 2xx (success) → no retry. All 3xx (redirects) → no retry. All 4xx except 429 (client errors: 400, 401, 403, 404, 410, 422, etc.) → no retry. Rationale: client errors indicate a problem with the webhook configuration itself, not transient server conditions; retrying would not change the outcome.
- **Retry schedule** (calculateNextRetry): Exponential backoff with base 60s, multiplier 2x per attempt. Attempt 1: ~60s, Attempt 2: ~120s, Attempt 3: ~240s, Attempt 4: ~480s. Maximum delay capped at 3600s (1 hour). ±25% random jitter added to each calculated delay to avoid thundering herd.
- **Max retry budget**: 5 total attempts (1 initial + 4 retries). After the 4th retry fails, the attempt is permanently marked FAILED. Rationale: 5 attempts provide ~15 minutes of exponential backoff coverage (60+120+240+480=900s), which covers most transient outages. The 1-hour cap prevents unbounded delay growth.
- **New status RETRYING added** to WebhookAttemptStatus enum. Status lifecycle: PENDING → DELIVERING → (if retriable + budget) RETRYING → (future retry worker picks up) → DELIVERING → ... → SUCCEEDED or FAILED (terminal). FAILED means either non-retriable outcome or budget exhausted.
- **Retry metadata persisted** on WebhookAttempt: `attemptCount` (starts at 1, increments on each retry), `nextRetryAt` (computed datetime for next attempt, null if no retry scheduled), `lastRetryAt` (when the last delivery attempt occurred).
- **Rejected — retry worker in this loop.** The retry scheduling metadata is fully persisted, but the actual background re-delivery worker is deferred. Rationale: keeping the loop narrow. The worker needs a separate execution context (cron-based, or polling loop) and should be its own deliverable. The metadata structure is stable for the worker to consume.
- **Rejected — dead-letter queue.** Not needed at v1. Failed attempts remain in the WebhookAttempt table with status FAILED for manual inspection. A DLQ can be added later if failure rates justify it.
- **Rejected — per-webhook retry configuration (custom max attempts, custom delay).** Standardized policy for v1. Per-webhook overrides are backward-compatible additions (add fields to Webhook model, fall back to defaults).
- **Consequence — retry flow test gap:** The full end-to-end retry flow (delivery → classification → scheduling → re-delivery) cannot be tested without a running PostgreSQL instance. The triggerWebhooks function bypasses under VITEST. Pure-function tests cover isRetriable and calculateNextRetry exhaustively (25 tests). The finalizeAttempt DB update logic requires a real Prisma client.

### 2026-07-23 (webhook retry worker v1)
- **Worker claim strategy: `updateMany` with status filter.** The worker selects due RETRYING attempts, then claims each one via `updateMany({ where: { id, status: "RETRYING" }, data: { status: "DELIVERING" } })`. If `count === 0`, another worker already transitioned this attempt — skip it. This is an optimistic lock that works for single-process polling and provides basic at-least-once safety without transactions.
- **Worker scope: pure function, no scheduler dependency.** `processRetryAttempts()` is a self-contained async function that a scheduler (setInterval, cron, or future orchestration) calls. It receives no execution context — it fetches due work, processes it, and returns a summary. This keeps the worker testable and decoupled from any scheduling framework.
- **Webhook-deleted handling:** If the webhook referenced by an attempt no longer exists (deleted by user), the worker marks the attempt as FAILED with `errorMessage: "Webhook deleted"` and skips delivery. This prevents orphaned attempts from retrying forever or erroring silently.
- **Concurrency model:** Single-process, single-threaded (Node.js event loop). `updateMany` claim provides basic mutual exclusion. For true multi-process safety, a `@unique` claim token or database-level advisory lock would be needed — deferred until multi-worker deployment is required.
- **Rejected — background worker as a long-lived process.** The worker is a function, not a daemon. It can be called from any execution context (HTTP endpoint for manual invocation, setInterval for polling, cron job for scheduled execution). This preserves flexibility and avoids premature infrastructure decisions.
- **Resolved — claim-and-crash hang risk.** The claim step (updateMany) and finalize step (update) are separated by an HTTP call (deliverWebhook). A crash between claim and finalize leaves the attempt in `DELIVERING`. The stale recovery mechanism (stale DELIVERING grace period = 30s) converts this from a permanent trap into a time-bounded lease — the next worker tick recovers and re-delivers the attempt. At-least-once delivery is documented and accepted.
- **Consequence — retry worker integration test gap:** The full end-to-end worker flow (DB query → claim → HTTP delivery → DB finalize) cannot be tested without a running PostgreSQL instance. The worker function has no VITEST bypass (unlike route middleware), relying on mocked Prisma in tests. 10 tests cover selection, claim races, and outcome transitions via mocks. The concurrency claim pattern works correctly in the mock; true race behavior requires a real DB.

### 2026-07-23 (DELIVERING-state recovery loop)
- **Stale recovery mechanism:** Added `STALE_DELIVERING_GRACE_MS = 30_000` (30 seconds, 3× the 10s delivery timeout) as a lease-expiration threshold. The worker `findMany` query now uses `OR`: due RETRYING (nextRetryAt ≤ now) OR stale DELIVERING (createdAt < now - 30s). This converts the one-way trap into a time-bounded lease.
- **Claim generalization:** `claimAttempt()` accepts `expectedStatus: "RETRYING" | "DELIVERING"`. For RETRYING attempts the transition is `RETRYING → DELIVERING`. For stale DELIVERING attempts the worker first transitions `DELIVERING → RETRYING` (real status change for mutual exclusion), then calls `claimAttempt("RETRYING")` for `RETRYING → DELIVERING`. This replaces the original no-op `DELIVERING → DELIVERING` which provided no mutual exclusion (updateMany count matches unchanged rows).
- **Grace period justification:** 30s = 3 × 10s delivery timeout. This ensures an in-flight delivery (fetch pending, network latency, slow response) is never incorrectly classified as stale. A legitimate delivery has ~10s to complete; 30s provides a 3× safety margin. Documented in the constant name (`STALE_DELIVERING_GRACE_MS`) for operator clarity.
- **SUCCEEDED metadata fix:** `finalizeAttempt()` SUCCEEDED branch now stores `attemptCount`, `lastRetryAt`, `errorMessage: null`. Previously, successful retries retained the previous failure's `errorMessage` and showed incorrect `attemptCount` (1 instead of 2+). This ensures operators reading the record can determine how many deliveries happened and confirm no error condition.
- **Budget exhaustion on recovered attempts:** Stale DELIVERING attempts carry the same `attemptCount` as the original claim. When recovered, the increment `nextAttemptCount = attempt.attemptCount + 1` feeds into `finalizeAttempt` which calls `calculateNextRetry(nextAttemptCount)`. If budget is exhausted, the attempt goes to FAILED — same policy as RETRYING recovery. Budget is not reset on stale recovery.
- **Concurrency model:** Single-process, single-threaded. `updateMany` with status filter provides mutual exclusion via real status transitions. Stale DELIVERING claim uses `DELIVERING → RETRYING` (genuine status change) followed by `RETRYING → DELIVERING`. The first transition (`DELIVERING → RETRYING`) provides mutual exclusion — after one worker transitions it, a second worker's `updateMany({ where: { status: "DELIVERING" }, data: { status: "RETRYING" } })` matches zero rows and skips the attempt. For RETRYING claims, the direct `RETRYING → DELIVERING` transition provides the same guarantee.
- **Rejected — exactly-once delivery claim.** Stale recovery is at-least-once by design. A crash after delivery but before finalize means the next worker tick sees the stale DELIVERING attempt, recovers it, and re-delivers. The webhook endpoint may receive duplicate events. This is documented and accepted.
- **Consequence — stale recovery test gap:** The stale recovery query (`findMany` with `OR`) is tested via mock assertions (the query shape). True freshness filtering (DELIVERING attempts younger than 30s excluded) requires a real PostgreSQL instance with time-based queries. The mock test verifies the query structure includes the expected `createdAt: { lt: ... }` filter but cannot prove the DB enforces it correctly.

### 2026-07-23 (schedule runner v1)
- **Schedule runner claim strategy:** `updateMany` with `nextRunAt` as optimistic lock. The worker selects due schedules (`enabled=true, nextRunAt≤now`), then claims each via `updateMany({ where: { id, nextRunAt: expected }, data: { nextRunAt: sentinel } })`. If `count===0`, another worker already claimed it. This follows the same pattern as the webhook worker's status-based claim but uses a temporal field instead of a status enum — no schema enum change needed.
- **Claim sentinel:** Uses `new Date(0)` (Jan 1, 1970 UTC) as the claim marker. After dispatch, the actual `nextRunAt` is computed and persisted. A crash between claim and dispatch leaves the schedule with the sentinel date — no stale recovery mechanism for schedules yet (documented limitation).
- **Next-run computation:** Uses `cron-parser` library with `tz: "Etc/UTC"` to compute the next fire time strictly after the current time. This ensures UTC-consistent scheduling regardless of the server's local timezone. Rejected: writing a custom cron parser (error-prone, the supported cron subset includes ranges `N-M`, steps `*/N`, and comma combinations — a library handles edge cases like DST and month boundaries correctly).
- **Recurring vs one-off dispatch:** After a successful run dispatch, `computeNextRun` is called again. If it returns a valid date, the schedule is updated with the new `nextRunAt` and `lastRunAt`. If it returns null (no future time, e.g., a past one-off like `0 0 30 2 *`), the schedule is disabled (`enabled=false, nextRunAt=null`). One-off schedules with a valid future cron expression remain enabled and recurring.
- **Missing actor guard:** If the actor referenced by a schedule no longer exists or its `workspaceId` has changed, the schedule is disabled with `errorMessage: "Actor not found or workspace mismatch"`. This prevents orphaned schedules from erroring silently on every worker tick.
- **Dispatch failure recovery:** If `actorRun.create` throws, the original `nextRunAt` is restored on the schedule, ensuring the next worker tick retries. The error is not persisted (no `errorMessage` update) — operator visibility is a future concern.
- **Worker scope: pure function, no scheduler dependency.** `processDueSchedules()` is a self-contained async function that returns a `ScheduleRunnerResult` summary. It follows the same pattern as `processRetryAttempts()` from the webhook worker.
- **Rejected — schedule-level retry with backoff.** If a schedule fails to dispatch (DB error), it retries on the next worker tick (no backoff, no retry budget). Since the schedule's `nextRunAt` is restored, the next tick will select it again. This is simple and sufficient for transient DB failures. Persistent failures (e.g., missing actor) are handled by the missing-actor guard.
- **Rejected — separate `nextRunAt` claim column.** Using the existing `nextRunAt` field as both the scheduling target and the claim lock avoids a schema addition. The sentinel date `new Date(0)` is clearly distinguishable from any real schedule time.
- **Consequence — schedule claim-and-crash hang risk.** A crash between claim and dispatch leaves `nextRunAt` at the sentinel date. No stale recovery mechanism exists for schedules (unlike the webhook worker's stale DELIVERING recovery). This is documented as a risk. A future loop can add stale schedule recovery (e.g., find schedules with `nextRunAt=sentinel AND updatedAt > 30s ago` and restore them).
- **Consequence — schedule runner integration test gap.** The full end-to-end worker flow (DB query → claim → actor lookup → run creation → state update) cannot be tested without a running PostgreSQL instance. 13 unit tests cover computeNextRun (pure function) and processDueSchedules (via mocked Prisma). True claim race behavior and cron-based time filtering require a real DB.

