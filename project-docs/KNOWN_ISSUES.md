# KNOWN_ISSUES.md

## Open issues

### BLOCKER
- No database running locally — Prisma migrations and runtime require a PostgreSQL instance.

### MAJOR
- Production-grade execution isolation is not yet designed.
- Billing and metering are planned but not yet defined in detail.
- Final deployment topology is not yet confirmed.
- Prisma pinned to 6.x — Prisma 7.x requires config migration (prisma.config.ts + adapter pattern).
