# CHANGELOG.md

## Unreleased

### 2026-07-22
- Initialized loop-engineering project docs.
- Added MASTER_PLAN.md, ARCHITECTURE.md, STATE.json, TODO.md, DECISIONS.md, CHANGELOG.md, and KNOWN_ISSUES.md.
- Added VERIFIER.md and FIRST_LOOP_PROMPT.md for maker/checker split pattern.
- Expanded project-docs per agent-doc best practices: added REQUIREMENTS.md, ACCEPTANCE_CRITERIA.md, DOMAIN_MODEL.md, API_CONTRACTS.md, TEST_STRATEGY.md.
- Refined ARCHITECTURE.md ACTUAL section to reflect empty repo state.
- Added severity labels to KNOWN_ISSUES.md.
- Updated LOOP.md and VERIFIER.md read-first lists to include all doc files.
- Removed TEST_STRATEGY.md to match spec structure.
- REPOSITORY AUDIT: empty repo confirmed. Node v25.8.2, pnpm 11.13.1, Git 2.54.0 available. Docker not installed. No runnable commands exist.
- Updated ARCHITECTURE.md ACTUAL section with full audit findings.
- Updated STATE.json, TODO.md with audit completion.
- Next task identified: initialize Node.js + TypeScript project scaffold.
- LOOP 2: Initialized Node.js + TypeScript toolchain.
  - Created package.json, tsconfig.json, .gitignore, .env.example
  - Created eslint.config.js (flat config), .prettierrc, vitest.config.ts
  - Created placeholder src/index.ts and test/index.test.ts
  - Installed 156 dev dependencies
  - Verified: lint pass, typecheck pass, test pass (1/1)
- Updated ARCHITECTURE.md ACTUAL section, STATE.json, TODO.md, CHANGELOG.md.
- LOOP 3: Initialized Git repo and multi-tenant database foundation.
  - git init + first commit (26 files, b128a58)
  - Added Prisma 6.19.3 with PostgreSQL datasource
  - Created schema: User, Organization, Workspace, Membership (with Role enum)
  - Set up uniqueness constraints and explicit relations
  - Added pnpm prisma:validate, prisma:generate, prisma:studio scripts
  - Verified: prisma validate, prisma generate, lint, typecheck, test all pass.
  - Pinned Prisma to 6.x to avoid Prisma 7 config-breaking changes.
- LOOP 4: Added execution-domain schema for actors and runs.
  - Added ActorRunStatus enum: PENDING, RUNNING, SUCCEEDED, FAILED, CANCELED
  - Added Actor model (belongs to Workspace, unique slug per workspace)
  - Added ActorVersion model (belongs to Actor, unique version per actor)
  - Added ActorRun model (belongs to Actor + Workspace, optional ActorVersion, status, input/output JSON)
  - Added indexes on workspaceId, actorId, status for ActorRun
  - Verified: prisma validate, prisma generate, lint, typecheck, test all pass.
- LOOP 5: Added structured storage layer schema.
  - Added Dataset (scoped to Workspace, optional ActorRun provenance)
  - Added DatasetItem (scoped to Dataset, sequence-ordered, Json payload)
  - Added KeyValueStore (scoped to Workspace, optional ActorRun provenance)
  - Added KeyValueRecord (scoped to KeyValueStore, unique key per store, Json value)
  - Added RequestQueue (scoped to Workspace, optional ActorRun provenance)
  - Added RequestQueueItem (scoped to RequestQueue, uniqueKey dedup, String-based status)
  - All storage models have slug unique per workspace
  - Added indexes on dataset sequence, queue status
  - Updated Workspace with reverse relations for all 3 storage families
  - Verified: prisma validate, prisma generate, lint, typecheck, test all pass.
