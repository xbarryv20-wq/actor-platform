# FIRST_LOOP_PROMPT.md

Use this prompt to start the first real loop in the repository.

---

Read and obey:
- `/LOOP.md`
- all files in `/project-docs/`

You are starting Phase 0 of a loop-engineered build process for a multi-tenant actor-based automation platform.

Your job in this first loop is NOT to build the platform.
Your job is to establish truth about the repository and set up the next safe move.

## Objective

Complete exactly one first loop with this outcome:

1. audit the repository
2. detect the current stack and repo structure
3. detect runnable commands
4. identify what is real vs partial vs missing
5. update project docs to reflect reality
6. choose one smallest high-leverage next task
7. stop

Do not start implementing large product features in this first loop.

## Required loop structure

Return your work in this structure:

### A. CURRENT STATE
State:
- current phase
- current goal
- selected first-loop task
- why it is the highest-leverage starting task

### B. MICRO-PLAN
Use 3 to 7 steps only.

### C. IMPLEMENTATION
Perform the following:

#### 1. Repository audit
Inspect:
- root files
- package manager
- frontend/backend structure
- database config
- docker files
- CI files
- env example files
- lint/typecheck/test/build scripts
- app entry points
- worker-related code if present
- schema/migrations if present

#### 2. Reality mapping
Update `/project-docs/ARCHITECTURE.md` with:
- ACTUAL:
- TARGET:
- GAP:

The ACTUAL section must describe only what truly exists in the repo.
Do not write aspirational claims into ACTUAL.

#### 3. State correction
Update `/project-docs/STATE.json` with:
- current task completed or adjusted
- completed tasks
- blocked tasks if any
- next tasks reordered based on reality
- last verification commands actually run

#### 4. Task board update
Update `/project-docs/TODO.md` to reflect:
- what already exists
- what is still missing
- what should come next

#### 5. Changelog update
Append a concise note to `/project-docs/CHANGELOG.md`.

#### 6. Known issues update
If critical gaps or risks are discovered, add them to `/project-docs/KNOWN_ISSUES.md`.

### D. VERIFICATION
Actually run the relevant commands you discover.

At minimum, attempt to determine:
- install command
- lint command
- typecheck command
- test command
- build command

If commands do not exist, state that clearly.
If install or verification fails, record the exact reason.

Do not fabricate success.

### E. RESULT
Report:
- what stack was detected
- what works today
- what is missing
- what commands were confirmed
- what risks were found
- what exact next task should happen

### F. STATE UPDATE
Confirm which files were updated and what the next loop target is.

End with exactly:

NEXT LOOP TARGET:
<one exact task>

## Additional constraints

- Do not rewrite architecture just because you prefer another stack.
- Do not add new frameworks in the first loop unless required to make the repo auditable.
- Do not build auth, actors, schedules, datasets, or billing in the first loop.
- Do not create fake code just to make progress look bigger.
- Keep the first loop about truth, structure, and next-step clarity.

## Preferred next-task selection logic

When selecting the next loop target, prioritize in this order:

1. broken install/build/lint/test foundations
2. missing architecture-critical scaffolding
3. missing auth/tenancy foundations
4. actor registry foundation
5. run engine foundation

## Context for product shape

This repository aims to become a platform where tools/actors can run asynchronously, produce structured outputs, be scheduled, and expose results through storage and APIs. These are common platform primitives in actor-based systems, where runs, datasets, schedules, and async retrieval are key workflows. [web:44][web:53][web:64]

## Start now

Execute the first loop and stop after documentation updates and verification.
Do not continue into a second loop automatically.
