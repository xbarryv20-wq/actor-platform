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
