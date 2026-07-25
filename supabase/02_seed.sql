-- ============================================================
-- Actor Platform Seed Data — Development/Staging only
-- Run after 01_schema.sql in Supabase SQL Editor
-- ============================================================

-- NOTE: API tokens require SHA-256 hashed values that cannot
-- be pre-computed in SQL. Use the Prisma seed script instead:
--   pnpm run seed
-- See supabase/README.md for details.

insert into "User" ("id", "email", "name", "updatedAt")
values ('user-1', 'admin@example.com', 'Admin User', now())
on conflict ("id") do nothing;

insert into "Organization" ("id", "name", "slug", "updatedAt")
values ('org-1', 'Default Org', 'default-org', now())
on conflict ("id") do nothing;

insert into "Workspace" ("id", "organizationId", "name", "slug", "updatedAt")
values ('ws-1', 'org-1', 'Default Workspace', 'default-workspace', now())
on conflict ("id") do nothing;

insert into "WorkspaceMembership" ("id", "userId", "workspaceId", "role")
values ('mem-1', 'user-1', 'ws-1', 'OWNER')
on conflict ("id") do nothing;
