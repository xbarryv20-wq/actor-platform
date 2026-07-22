# DOMAIN_MODEL.md

## Status

This file describes the **target** domain model. The ACTUAL schema may be a subset.

### ACTUAL implementation (loop 4):
- User, Organization, Membership (MembershipRole: OWNER, ADMIN, MEMBER), Workspace
- Actor (belongs to Workspace, slug unique per workspace)
- ActorVersion (belongs to Actor, version unique per actor, optional sourceReference, changelog)
- ActorRun (belongs to Actor + Workspace, optional ActorVersion, status enum, input/output Json?, errorMessage?, timestamps)
- ActorRunStatus: PENDING, RUNNING, SUCCEEDED, FAILED, CANCELED

Fields not yet in schema but listed below are aspirational targets.

## Purpose

This file defines the core business entities for the platform and the intended relationships between them. It is meant to reduce schema drift, API mismatch, and UI confusion.

## Modeling rules

- Every tenant-owned entity must belong to an organization or workspace boundary.
- Ownership and tenancy must be explicit.
- Runtime objects must link back to the actor/version that produced them.
- Storage objects must support both UI and API retrieval.
- Publication-facing objects should be distinct from internal/private authoring objects.

## Core entities

### User
Represents an authenticated person using the platform.

Suggested fields:
- id
- email
- displayName
- avatarUrl
- createdAt
- updatedAt
- status

### Organization
Represents a tenant or top-level team boundary.

Suggested fields:
- id
- name
- slug
- ownerUserId
- createdAt
- updatedAt

### Workspace
Represents an operational scope within an organization.

Suggested fields:
- id
- organizationId
- name
- slug
- createdAt
- updatedAt

### Membership
Represents a user's relationship to an organization or workspace.

Suggested fields:
- id
- userId
- organizationId or workspaceId
- role
- createdAt

### Actor
Represents an automation tool definition. Actor-oriented systems generally expose reusable run targets that can be invoked repeatedly through UI or API.[cite:1][cite:65]

Suggested fields:
- id
- workspaceId
- name
- slug
- description
- ownerUserId
- latestVersionId
- visibility
- status
- createdAt
- updatedAt

### ActorVersion
Represents a versioned implementation/configuration of an actor.

Suggested fields:
- id
- actorId
- versionNumber or tag
- sourceRef
- runtimeType
- inputSchemaRef
- outputSchemaRef
- isPublished
- createdAt
- createdByUserId

### TaskPreset
Represents a saved execution recipe for an actor/version, similar to a saved task configuration with reusable input and run defaults.[cite:53]

Suggested fields:
- id
- workspaceId
- actorId
- actorVersionId
- name
- inputPayload
- defaultMemory
- defaultTimeout
- defaultBuildTag
- createdAt
- updatedAt

### ActorRun
Represents one execution instance of an actor. Actor platforms commonly expose runs as asynchronous resources with lifecycle state and output references.[cite:44][cite:55]

Suggested fields:
- id
- workspaceId
- actorId
- actorVersionId
- taskPresetId nullable
- triggeredByUserId nullable
- triggeredByScheduleId nullable
- triggeredByApiTokenId nullable
- status
- startedAt
- finishedAt
- defaultDatasetId nullable
- defaultKeyValueStoreId nullable
- requestQueueId nullable
- exitCode nullable
- errorMessage nullable
- createdAt
- updatedAt

### RunLogEntry
Represents time-ordered logs or status messages for a run.

Suggested fields:
- id
- actorRunId
- level
- message
- timestamp
- metadata nullable

### Dataset
Represents structured output storage for row-like result data.[cite:42][cite:88]

Suggested fields:
- id
- workspaceId
- actorRunId nullable
- name
- schemaRef nullable
- createdAt
- updatedAt

### DatasetItem
Represents one structured output record within a dataset.

Suggested fields:
- id
- datasetId
- itemIndex
- payload
- createdAt

### KeyValueStore
Represents named storage for configuration, files, or intermediate records.[cite:81][cite:87]

Suggested fields:
- id
- workspaceId
- actorRunId nullable
- name
- createdAt
- updatedAt

### KeyValueRecord
Represents one record in a key-value store.

Suggested fields:
- id
- keyValueStoreId
- recordKey
- contentType
- valueRef or inlineValue
- createdAt
- updatedAt

### RequestQueue
Represents a queue of crawl/task requests for progressive processing.[cite:81][cite:82]

Suggested fields:
- id
- workspaceId
- actorRunId nullable
- name
- createdAt
- updatedAt

### RequestQueueItem
Represents one queued request/work unit.

Suggested fields:
- id
- requestQueueId
- uniqueKey
- url or payload
- status
- retryCount
- lastAttemptAt nullable
- createdAt
- updatedAt

### Schedule
Represents a recurring trigger that starts actor or task-like execution according to cron-style configuration.[cite:86][cite:53]

Suggested fields:
- id
- workspaceId
- name
- cronExpression
- timezone
- enabled
- targetType
- targetActorId nullable
- targetTaskPresetId nullable
- inputOverride nullable
- createdByUserId
- createdAt
- updatedAt

### Webhook
Represents an outbound event subscription triggered by platform events.[cite:89]

Suggested fields:
- id
- workspaceId
- name
- eventType
- targetUrl
- secretRef nullable
- enabled
- createdAt
- updatedAt

### WebhookDispatch
Represents one delivery attempt for a webhook.

Suggested fields:
- id
- webhookId
- eventId
- statusCode nullable
- deliveryStatus
- attemptedAt
- responseSnippet nullable

### ApiToken
Represents a scoped credential for API access.

Suggested fields:
- id
- workspaceId or organizationId
- label
- tokenHash
- scopes
- createdByUserId
- lastUsedAt nullable
- revokedAt nullable
- createdAt

### MarketplaceListing
Represents a public or shared listing for an actor/tool in the marketplace.

Suggested fields:
- id
- actorId
- ownerWorkspaceId
- title
- shortDescription
- category
- visibility
- pricingModel
- publishedAt nullable
- createdAt
- updatedAt

### Plan
Represents a plan or entitlement tier.

Suggested fields:
- id
- name
- code
- limitsJson
- createdAt
- updatedAt

### Subscription
Represents a tenant's active commercial subscription state.

Suggested fields:
- id
- organizationId
- planId
- status
- billingProviderRef nullable
- currentPeriodStart nullable
- currentPeriodEnd nullable
- createdAt
- updatedAt

### UsageRecord
Represents a billable or metered event.

Suggested fields:
- id
- organizationId or workspaceId
- actorRunId nullable
- metricType
- quantity
- periodKey
- createdAt

### AuditEvent
Represents a security- or governance-relevant action.

Suggested fields:
- id
- organizationId
- workspaceId nullable
- actorUserId nullable
- actionType
- resourceType
- resourceId
- metadata nullable
- createdAt

## Key relationships

- Organization has many Workspaces.
- User has many Memberships.
- Workspace has many Actors.
- Actor has many ActorVersions.
- ActorVersion has many ActorRuns.
- ActorRun may reference one default Dataset, one default KeyValueStore, and one RequestQueue.[cite:44][cite:55]
- Dataset has many DatasetItems.
- KeyValueStore has many KeyValueRecords.
- RequestQueue has many RequestQueueItems.
- Workspace has many Schedules, Webhooks, ApiTokens, and MarketplaceListings.
- Organization has one or more Subscriptions and many UsageRecords.
- Critical actions produce AuditEvents.

## Status enums to define explicitly

### ActorRun.status
Suggested values:
- CREATED
- QUEUED
- STARTING
- RUNNING
- SUCCEEDED
- FAILED
- ABORTING
- ABORTED
- TIMED_OUT

### RequestQueueItem.status
Suggested values:
- PENDING
- CLAIMED
- SUCCEEDED
- FAILED
- DEAD_LETTER

### Subscription.status
Suggested values:
- TRIALING
- ACTIVE
- PAST_DUE
- CANCELED
- EXPIRED

## Modeling cautions

- Do not collapse Actor and ActorVersion into one table if versioning is a core platform feature.
- Do not make tenant scoping implicit.
- Do not store logs only in ephemeral memory if run observability matters.
- Do not conflate private actor definitions with marketplace listings.
- Do not skip explicit run-storage references; output retrieval is a core workflow in actor platforms.[cite:44][cite:55][cite:88]
