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
- ROOT: LOOP.md, VERIFIER.md, FIRST_LOOP_PROMPT.md, package.json, tsconfig.json, eslint.config.js, .prettierrc, vitest.config.ts, .gitignore, .env.example, src/, test/, project-docs/.
- Tooling: TypeScript 5.9, ESLint 9.39, Vitest 3.2, Prettier 3.9.
- Runnable commands: `pnpm lint` (pass), `pnpm typecheck` (pass), `pnpm test` (pass).
- No database, no CI, no Docker, no Git yet.
- Stack chosen: Node.js + TypeScript with pnpm (matches LOOP.md preference).

### Available tooling:
- Node.js v25.8.2
- npm 11.12.0
- pnpm 11.13.1
- Git 2.54.0
- Docker: not installed

### TARGET:
- Multi-tenant modular SaaS platform as described above.

### GAP:
- Zero code exists — full gap between ACTUAL (empty) and TARGET (full platform).
- First task: establish project scaffolding and development foundations.
