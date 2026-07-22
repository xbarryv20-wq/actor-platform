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
