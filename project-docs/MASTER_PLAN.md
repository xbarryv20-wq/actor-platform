# MASTER_PLAN.md

## Product goal

Build a production-minded cloud platform for actor-based web automation and data extraction.

The platform should support:
- user and organization accounts
- actor creation and versioning
- actor runs with async execution
- structured storage outputs
- schedules and webhooks
- console UI
- marketplace support
- billing/metering
- audit and admin controls
- API-first integrations

## Product principles

- API-first
- modular services
- multi-tenant by design
- secure by default
- async-job native
- verifiable progress over broad claims
- shippable slices
- document decisions as work evolves

## Phased roadmap

### Phase 0 — Foundation
Goal:
Establish repo standards, architecture baseline, quality gates, and operational docs.

Outputs:
- repo audit complete
- architecture documented
- lint/typecheck/test commands known
- env example created
- logging/error strategy present
- CI baseline present (.github/workflows/ci.yml — lint, typecheck, test on push/PR)
- docs initialized

Exit criteria:
- project can be installed and verified locally
- docs reflect actual repo state
- first safe development slice identified

### Phase 1 — Identity & Tenancy
Goal:
Support authenticated users and isolated tenant/workspace boundaries.

Outputs:
- auth flow
- user model
- org/workspace model
- membership model
- role model
- tenant-aware query strategy

Exit criteria:
- users can sign in
- workspace data is tenant-scoped
- protected routes enforce authorization

### Phase 2 — Actor Registry
Goal:
Represent automation tools as versioned entities with clear input/output contracts.

Outputs:
- actor model
- actor version model
- actor metadata
- input schema support
- draft/published states

Exit criteria:
- user can create and manage actors
- actors have versions
- actor definition contract is documented

### Phase 3 — Run Engine
Goal:
Execute actors asynchronously and track run lifecycle.

Outputs:
- run creation API
- queue-backed worker
- run statuses
- retry behavior
- cancellation
- logs capture

Exit criteria:
- a run can be created and processed
- lifecycle visible in DB and UI/API
- failure states are recorded

### Phase 4 — Storage
Goal:
Provide structured result storage primitives.

Outputs:
- datasets
- dataset items
- key-value stores
- request queues
- export/read APIs

Exit criteria:
- run outputs can be persisted and retrieved
- data export path exists
- storage objects are tenant-scoped

### Phase 5 — Automation
Goal:
Support recurring and event-driven execution.

Outputs:
- schedules
- cron execution path
- webhook trigger path
- basic notifications or event logging

Exit criteria:
- scheduled runs can be created
- triggered runs are visible and auditable

### Phase 6 — Console UI
Goal:
Deliver a usable operator-facing product interface.

Outputs:
- dashboard
- actor list/detail
- run list/detail
- logs viewer
- storage explorer
- schedule manager

Exit criteria:
- major platform actions can be done through UI
- UI matches real backend behavior

### Phase 7 — Marketplace
Goal:
Allow publication and discovery of reusable actors.

Outputs:
- listing model
- listing pages
- publish flow
- install/use flow
- metadata/search baseline

Exit criteria:
- actors can be listed and browsed
- marketplace data is separate from private drafts

### Phase 8 — Billing & Metering
Goal:
Prepare for monetization and usage tracking.

Outputs:
- plan model
- subscription model
- usage records
- run/storage usage accounting

Exit criteria:
- billable events are tracked
- usage summaries are queryable

### Phase 9 — Enterprise & Admin
Goal:
Add compliance, auditability, and privileged admin operations.

Outputs:
- audit event model
- audit views
- admin controls
- policy hooks
- security review notes

Exit criteria:
- critical actions create audit events
- admin workflows exist and are protected

### Phase 10 — Integrations
Goal:
Expose the platform to external systems and agent workflows.

Outputs:
- API tokens
- external API hardening
- webhook consumers
- no-code friendly integration surfaces
- agent/tool-facing endpoints

Exit criteria:
- external systems can securely trigger and read core workflows

## Golden build rules

1. Build vertically, not only by layer.
2. Prefer real end-to-end slices over isolated scaffolding.
3. Every completed slice must be verified.
4. Documentation must track reality.
5. Security and tenant isolation are never "later" concerns.
6. UI completion does not count if backend is fake.
7. Backend completion does not count if contracts are undocumented.
8. Smaller loops beat ambitious loops.
