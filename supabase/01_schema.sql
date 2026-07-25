-- ============================================================
-- Actor Platform Schema — v1.0.0
-- Generated from prisma/schema.prisma and migrations
-- Use in Supabase SQL Editor to bootstrap a fresh database
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ─── Enums ─────────────────────────────────────────────────────

create type "MembershipRole" as enum ('OWNER', 'ADMIN', 'MEMBER');
create type "ActorStatus" as enum ('DRAFT', 'PUBLISHED', 'DEPRECATED');
create type "ActorRunStatus" as enum ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELED');
create type "WebhookAttemptStatus" as enum ('PENDING', 'DELIVERING', 'RETRYING', 'SUCCEEDED', 'FAILED');
create type "EventType" as enum ('RUN_CREATED', 'RUN_SUCCEEDED', 'RUN_FAILED', 'RUN_CANCELED', 'SCHEDULE_DISPATCHED', 'ACTOR_PUBLISHED', 'MARKETPLACE_LISTED', 'MARKETPLACE_APPROVED', 'MARKETPLACE_REJECTED', 'MARKETPLACE_UNPUBLISHED');
create type "ListingStatus" as enum ('PENDING', 'APPROVED', 'REJECTED', 'UNPUBLISHED');
create type "SubscriptionStatus" as enum ('ACTIVE', 'CANCELED', 'EXPIRED');

-- ─── Tables ────────────────────────────────────────────────────

create table if not exists "User" (
    "id" text primary key default gen_random_uuid()::text,
    "email" text not null,
    "name" text not null,
    "createdAt" timestamptz not null default now(),
    "updatedAt" timestamptz not null
);
create unique index if not exists "User_email_key" on "User"("email");

create table if not exists "Organization" (
    "id" text primary key default gen_random_uuid()::text,
    "name" text not null,
    "slug" text not null,
    "createdAt" timestamptz not null default now(),
    "updatedAt" timestamptz not null
);
create unique index if not exists "Organization_slug_key" on "Organization"("slug");

create table if not exists "Membership" (
    "id" text primary key default gen_random_uuid()::text,
    "userId" text not null references "User"("id") on delete restrict,
    "organizationId" text not null references "Organization"("id") on delete restrict,
    "role" "MembershipRole" not null default 'MEMBER',
    "createdAt" timestamptz not null default now()
);
create unique index if not exists "Membership_userId_organizationId_key" on "Membership"("userId", "organizationId");

create table if not exists "Workspace" (
    "id" text primary key default gen_random_uuid()::text,
    "organizationId" text not null references "Organization"("id") on delete restrict,
    "name" text not null,
    "slug" text not null,
    "createdAt" timestamptz not null default now(),
    "updatedAt" timestamptz not null
);
create unique index if not exists "Workspace_organizationId_slug_key" on "Workspace"("organizationId", "slug");

create table if not exists "WorkspaceMembership" (
    "id" text primary key default gen_random_uuid()::text,
    "userId" text not null references "User"("id") on delete restrict,
    "workspaceId" text not null references "Workspace"("id") on delete restrict,
    "role" text not null default 'MEMBER',
    "createdAt" timestamptz not null default now()
);
create index if not exists "WorkspaceMembership_workspaceId_idx" on "WorkspaceMembership"("workspaceId");
create unique index if not exists "WorkspaceMembership_userId_workspaceId_key" on "WorkspaceMembership"("userId", "workspaceId");

create table if not exists "Actor" (
    "id" text primary key default gen_random_uuid()::text,
    "workspaceId" text not null references "Workspace"("id") on delete restrict,
    "ownerId" text references "User"("id") on delete set null,
    "name" text not null,
    "slug" text not null,
    "description" text,
    "tags" text[] not null default '{}',
    "icon" text,
    "status" "ActorStatus" not null default 'DRAFT',
    "inputSchema" jsonb,
    "createdAt" timestamptz not null default now(),
    "updatedAt" timestamptz not null
);
create index if not exists "Actor_ownerId_idx" on "Actor"("ownerId");
create unique index if not exists "Actor_workspaceId_slug_key" on "Actor"("workspaceId", "slug");

create table if not exists "ActorVersion" (
    "id" text primary key default gen_random_uuid()::text,
    "actorId" text not null references "Actor"("id") on delete restrict,
    "version" integer not null,
    "inputSchema" jsonb,
    "sourceReference" text,
    "changelog" text,
    "createdAt" timestamptz not null default now()
);
create unique index if not exists "ActorVersion_actorId_version_key" on "ActorVersion"("actorId", "version");

create table if not exists "ApiToken" (
    "id" text primary key default gen_random_uuid()::text,
    "userId" text not null references "User"("id") on delete restrict,
    "tokenHash" text not null,
    "label" text not null,
    "scopes" text not null,
    "lastUsedAt" timestamptz,
    "createdAt" timestamptz not null default now(),
    "revokedAt" timestamptz
);
create unique index if not exists "ApiToken_tokenHash_key" on "ApiToken"("tokenHash");
create index if not exists "ApiToken_userId_idx" on "ApiToken"("userId");

create table if not exists "ActorRun" (
    "id" text primary key default gen_random_uuid()::text,
    "actorId" text not null references "Actor"("id") on delete restrict,
    "actorVersionId" text references "ActorVersion"("id") on delete set null,
    "workspaceId" text not null references "Workspace"("id") on delete restrict,
    "status" "ActorRunStatus" not null default 'PENDING',
    "input" jsonb,
    "output" jsonb,
    "errorMessage" text,
    "createdAt" timestamptz not null default now(),
    "startedAt" timestamptz,
    "finishedAt" timestamptz
);
create index if not exists "ActorRun_workspaceId_idx" on "ActorRun"("workspaceId");
create index if not exists "ActorRun_actorId_idx" on "ActorRun"("actorId");
create index if not exists "ActorRun_status_idx" on "ActorRun"("status");

create table if not exists "LogEntry" (
    "id" text primary key default gen_random_uuid()::text,
    "runId" text not null references "ActorRun"("id") on delete restrict,
    "level" text not null default 'INFO',
    "message" text not null,
    "metadata" jsonb,
    "timestamp" timestamptz not null default now()
);
create index if not exists "LogEntry_runId_idx" on "LogEntry"("runId");
create index if not exists "LogEntry_runId_level_idx" on "LogEntry"("runId", "level");

create table if not exists "Dataset" (
    "id" text primary key default gen_random_uuid()::text,
    "workspaceId" text not null references "Workspace"("id") on delete restrict,
    "actorRunId" text references "ActorRun"("id") on delete set null,
    "ownerId" text references "User"("id") on delete set null,
    "name" text not null,
    "slug" text not null,
    "createdAt" timestamptz not null default now(),
    "updatedAt" timestamptz not null
);
create index if not exists "Dataset_actorRunId_idx" on "Dataset"("actorRunId");
create index if not exists "Dataset_ownerId_idx" on "Dataset"("ownerId");
create unique index if not exists "Dataset_workspaceId_slug_key" on "Dataset"("workspaceId", "slug");

create table if not exists "DatasetItem" (
    "id" text primary key default gen_random_uuid()::text,
    "datasetId" text not null references "Dataset"("id") on delete restrict,
    "sequence" integer not null,
    "payload" jsonb not null,
    "createdAt" timestamptz not null default now()
);
create index if not exists "DatasetItem_datasetId_sequence_idx" on "DatasetItem"("datasetId", "sequence");

create table if not exists "KeyValueStore" (
    "id" text primary key default gen_random_uuid()::text,
    "workspaceId" text not null references "Workspace"("id") on delete restrict,
    "actorRunId" text references "ActorRun"("id") on delete set null,
    "ownerId" text references "User"("id") on delete set null,
    "name" text not null,
    "slug" text not null,
    "createdAt" timestamptz not null default now(),
    "updatedAt" timestamptz not null
);
create index if not exists "KeyValueStore_actorRunId_idx" on "KeyValueStore"("actorRunId");
create index if not exists "KeyValueStore_ownerId_idx" on "KeyValueStore"("ownerId");
create unique index if not exists "KeyValueStore_workspaceId_slug_key" on "KeyValueStore"("workspaceId", "slug");

create table if not exists "KeyValueRecord" (
    "id" text primary key default gen_random_uuid()::text,
    "storeId" text not null references "KeyValueStore"("id") on delete restrict,
    "key" text not null,
    "value" jsonb not null,
    "contentType" text,
    "createdAt" timestamptz not null default now(),
    "updatedAt" timestamptz not null
);
create unique index if not exists "KeyValueRecord_storeId_key_key" on "KeyValueRecord"("storeId", "key");

create table if not exists "RequestQueue" (
    "id" text primary key default gen_random_uuid()::text,
    "workspaceId" text not null references "Workspace"("id") on delete restrict,
    "actorRunId" text references "ActorRun"("id") on delete set null,
    "ownerId" text references "User"("id") on delete set null,
    "name" text not null,
    "slug" text not null,
    "createdAt" timestamptz not null default now(),
    "updatedAt" timestamptz not null
);
create index if not exists "RequestQueue_actorRunId_idx" on "RequestQueue"("actorRunId");
create index if not exists "RequestQueue_ownerId_idx" on "RequestQueue"("ownerId");
create unique index if not exists "RequestQueue_workspaceId_slug_key" on "RequestQueue"("workspaceId", "slug");

create table if not exists "RequestQueueItem" (
    "id" text primary key default gen_random_uuid()::text,
    "queueId" text not null references "RequestQueue"("id") on delete restrict,
    "uniqueKey" text not null,
    "url" text,
    "payload" jsonb,
    "status" text not null default 'PENDING',
    "retryCount" integer not null default 0,
    "handledAt" timestamptz,
    "createdAt" timestamptz not null default now()
);
create index if not exists "RequestQueueItem_queueId_status_idx" on "RequestQueueItem"("queueId", "status");
create unique index if not exists "RequestQueueItem_queueId_uniqueKey_key" on "RequestQueueItem"("queueId", "uniqueKey");

create table if not exists "Schedule" (
    "id" text primary key default gen_random_uuid()::text,
    "workspaceId" text not null references "Workspace"("id") on delete restrict,
    "actorId" text not null references "Actor"("id") on delete restrict,
    "actorVersionId" text references "ActorVersion"("id") on delete set null,
    "cronExpression" text not null,
    "inputOverride" jsonb,
    "enabled" boolean not null default true,
    "nextRunAt" timestamptz,
    "lastRunAt" timestamptz,
    "errorMessage" text,
    "createdAt" timestamptz not null default now(),
    "updatedAt" timestamptz not null
);
create index if not exists "Schedule_workspaceId_idx" on "Schedule"("workspaceId");
create index if not exists "Schedule_enabled_nextRunAt_idx" on "Schedule"("enabled", "nextRunAt");

create table if not exists "Webhook" (
    "id" text primary key default gen_random_uuid()::text,
    "workspaceId" text not null references "Workspace"("id") on delete restrict,
    "actorId" text not null references "Actor"("id") on delete restrict,
    "ownerId" text references "User"("id") on delete set null,
    "eventTypes" text not null,
    "url" text not null,
    "secret" text,
    "enabled" boolean not null default true,
    "createdAt" timestamptz not null default now(),
    "updatedAt" timestamptz not null
);
create index if not exists "Webhook_workspaceId_idx" on "Webhook"("workspaceId");
create index if not exists "Webhook_actorId_idx" on "Webhook"("actorId");
create index if not exists "Webhook_ownerId_idx" on "Webhook"("ownerId");

create table if not exists "WebhookAttempt" (
    "id" text primary key default gen_random_uuid()::text,
    "webhookId" text not null references "Webhook"("id") on delete restrict,
    "eventType" text not null,
    "status" "WebhookAttemptStatus" not null default 'PENDING',
    "attemptCount" integer not null default 1,
    "requestUrl" text not null,
    "requestBody" text,
    "responseStatusCode" integer,
    "responseBody" text,
    "errorMessage" text,
    "nextRetryAt" timestamptz,
    "lastRetryAt" timestamptz,
    "createdAt" timestamptz not null default now(),
    "completedAt" timestamptz
);
create index if not exists "WebhookAttempt_webhookId_idx" on "WebhookAttempt"("webhookId");
create index if not exists "WebhookAttempt_status_idx" on "WebhookAttempt"("status");
create index if not exists "WebhookAttempt_nextRetryAt_idx" on "WebhookAttempt"("nextRetryAt");
create index if not exists "WebhookAttempt_createdAt_idx" on "WebhookAttempt"("createdAt");

create table if not exists "PlatformEvent" (
    "id" text primary key default gen_random_uuid()::text,
    "workspaceId" text not null,
    "actorId" text,
    "actorVersionId" text,
    "runId" text,
    "scheduleId" text,
    "type" "EventType" not null,
    "message" text,
    "payload" jsonb,
    "createdAt" timestamptz not null default now()
);
create index if not exists "PlatformEvent_workspaceId_createdAt_idx" on "PlatformEvent"("workspaceId", "createdAt");
create index if not exists "PlatformEvent_type_createdAt_idx" on "PlatformEvent"("type", "createdAt");
create index if not exists "PlatformEvent_runId_idx" on "PlatformEvent"("runId");
create index if not exists "PlatformEvent_actorId_idx" on "PlatformEvent"("actorId");

create table if not exists "MarketplaceListing" (
    "id" text primary key default gen_random_uuid()::text,
    "actorId" text not null references "Actor"("id") on delete restrict,
    "publisherId" text not null references "User"("id") on delete restrict,
    "versionId" text,
    "status" "ListingStatus" not null default 'PENDING',
    "category" text,
    "createdAt" timestamptz not null default now(),
    "updatedAt" timestamptz not null
);
create index if not exists "MarketplaceListing_status_createdAt_idx" on "MarketplaceListing"("status", "createdAt");
create index if not exists "MarketplaceListing_publisherId_idx" on "MarketplaceListing"("publisherId");
create unique index if not exists "MarketplaceListing_actorId_key" on "MarketplaceListing"("actorId");

create table if not exists "Plan" (
    "id" text primary key default gen_random_uuid()::text,
    "name" text not null,
    "description" text,
    "priceCents" integer not null default 0,
    "runLimit" integer not null default 100,
    "storageMb" integer not null default 100,
    "interval" text not null default 'monthly',
    "createdAt" timestamptz not null default now(),
    "updatedAt" timestamptz not null
);

create table if not exists "Subscription" (
    "id" text primary key default gen_random_uuid()::text,
    "workspaceId" text not null,
    "planId" text not null references "Plan"("id") on delete restrict,
    "status" "SubscriptionStatus" not null default 'ACTIVE',
    "currentPeriodStart" timestamptz not null default now(),
    "currentPeriodEnd" timestamptz not null,
    "createdAt" timestamptz not null default now(),
    "canceledAt" timestamptz
);
create index if not exists "Subscription_workspaceId_idx" on "Subscription"("workspaceId");
create index if not exists "Subscription_status_currentPeriodEnd_idx" on "Subscription"("status", "currentPeriodEnd");

create table if not exists "UsageRecord" (
    "id" text primary key default gen_random_uuid()::text,
    "workspaceId" text not null,
    "periodStart" timestamptz not null,
    "periodEnd" timestamptz not null,
    "runsUsed" integer not null default 0,
    "storageBytes" integer not null default 0,
    "createdAt" timestamptz not null default now()
);
create index if not exists "UsageRecord_workspaceId_periodEnd_idx" on "UsageRecord"("workspaceId", "periodEnd");
create unique index if not exists "UsageRecord_workspaceId_periodStart_key" on "UsageRecord"("workspaceId", "periodStart");
