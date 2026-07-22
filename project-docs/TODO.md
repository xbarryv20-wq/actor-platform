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

## Next
- [x] Add Actor, ActorVersion, and ActorRun models
- [ ] Set up CI baseline
- [ ] Implement first vertical slice: user model + auth

## Phase 0 — Foundation
- [x] Confirm database and ORM choice (PostgreSQL + Prisma 6)
- [x] Confirm environment variable strategy
- [ ] Confirm queue/worker strategy
- [ ] Confirm logging and error handling baseline
- [ ] Confirm CI or add baseline CI
- [ ] Confirm Docker or local dev orchestration
- [ ] Add missing developer setup docs

## Phase 1 — Identity & Tenancy
- [x] User model (schema)
- [x] Organization/workspace model (schema)
- [x] Memberships (schema)
- [ ] Roles and permissions (runtime)
- [ ] Auth flow
- [ ] Protected routes and tenant scoping

## Phase 2 — Actor Registry
- [x] Actor model
- [x] Actor version model
- [ ] Actor input schema support
- [ ] Actor metadata
- [ ] Draft/publish workflow

## Phase 3 — Run Engine
- [x] Run model
- [ ] Run creation endpoint
- [ ] Worker execution path
- [ ] Status lifecycle
- [ ] Logs
- [ ] Retry and cancellation behavior

## Phase 4 — Storage
- [ ] Dataset model
- [ ] Dataset item model
- [ ] Key-value store model
- [ ] Request queue model
- [ ] Export/read endpoints

## Phase 5 — Automation
- [ ] Schedule model
- [ ] Scheduler execution path
- [ ] Webhook model
- [ ] Trigger flow
- [ ] Notification/event baseline

## Phase 6 — Console UI
- [ ] Dashboard
- [ ] Actor list/detail
- [ ] Run list/detail
- [ ] Log viewer
- [ ] Storage explorer
- [ ] Schedule manager

## Phase 7 — Marketplace
- [ ] Listing model
- [ ] Publish flow
- [ ] Browse/search
- [ ] Use/install flow
- [ ] Marketplace governance placeholders

## Phase 8 — Billing & Metering
- [ ] Plan model
- [ ] Subscription model
- [ ] Usage records
- [ ] Metered accounting events
- [ ] Usage summary views

## Phase 9 — Enterprise & Admin
- [ ] Audit events
- [ ] Admin tools
- [ ] Policy controls
- [ ] Security review checklist

## Phase 10 — Integrations
- [ ] API tokens
- [ ] Public API hardening
- [ ] Webhook consumers
- [ ] No-code integration adapters
- [ ] Agent/tool-facing endpoints
