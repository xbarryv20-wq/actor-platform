# API_CONTRACTS.md

## Purpose

This document defines the actual API contracts for the platform as implemented. These contracts reflect the current codebase and should be updated whenever routes, scopes, or response shapes change.

## API design principles

- REST-first.
- JSON request/response bodies.
- Auth required for all protected resources via `Authorization: Bearer <token>`.
- Tenant scoping enforced server-side via workspace path params.
- Cursor-based pagination for collection endpoints.
- Consistent `{ error: string }` / `{ error: string, details: ... }` error envelope.
- Async execution flows return a run resource immediately.

## Authentication

Protected routes require a Bearer token with appropriate scopes:
```
Authorization: Bearer <token>
```

Tokens are created via `POST /workspaces/:workspaceId/api-tokens` and support 14 scopes:
`actors:read`, `actors:write`, `runs:read`, `runs:write`, `storage:read`, `storage:write`,
`webhooks:read`, `webhooks:write`, `tokens:read`, `tokens:write`, `workspace:read`,
`workspace:write`, `schedules:read`, `schedules:write`

Default token scopes are read-only (7 scopes). MEMBER role cannot create tokens with `workspace:write`.

## Error envelope

All errors follow one of these shapes:

```json
{
  "error": "Human-readable error message"
}
```

```json
{
  "error": "Invalid input",
  "details": { "fieldErrors": { "name": ["Required"] }, "formErrors": [] }
}
```

HTTP status codes used: 200, 201, 400, 401, 403, 404, 409, 422, 500.

## Pagination

All list endpoints use cursor-based pagination:

```json
{
  "<resource>": [ ... ],
  "nextCursor": "cuid_string_or_null"
}
```

Query params: `limit` (1-100, default 10-50 depending on resource), `cursor` (opaque cursor string).

## Core resources

### 1. System

#### Health check
`GET /health` — public, no auth.

Response:
```json
{
  "status": "ok",
  "service": "actor-platform",
  "version": "0.0.1",
  "timestamp": "2026-07-24T00:00:00Z",
  "db": { "status": "connected" }
}
```

#### OpenAPI spec
`GET /openapi.json` — public. Returns OpenAPI 3.1 specification.

#### Swagger UI
`GET /docs` — public. Returns Swagger UI HTML page loading spec from `/openapi.json`.

### 2. Workspaces

All routes under `/workspaces/:workspaceId` require auth. Resources are tenant-scoped.

#### Get workspace
`GET /workspaces/:workspaceId` — scope: `workspace:read`

```json
{ "id": "ws_1", "name": "My Workspace", "slug": "my-workspace", "organizationId": "org_1", "createdAt": "...", "updatedAt": "..." }
```

#### Update workspace
`PATCH /workspaces/:workspaceId` — scope: `workspace:write`, role: OWNER/ADMIN

Body: `{ "name": "...", "slug": "..." }`

#### List members
`GET /workspaces/:workspaceId/members` — scope: `workspace:read`

Returns `{ members: [{ id, userId, role, createdAt, user: { id, email, name } }] }`

#### Add member
`POST /workspaces/:workspaceId/members` — scope: `workspace:write`, role: OWNER/ADMIN

Body: `{ "userId": "...", "role": "OWNER|ADMIN|MEMBER" }`

#### Update member role
`PATCH /workspaces/:workspaceId/members/:userId` — role: OWNER only

#### Remove member
`DELETE /workspaces/:workspaceId/members/:userId` — role: OWNER only, guarded against removing last owner

### 3. Actors

All actor routes are under `/workspaces/:workspaceId/actors`. Scopes: `actors:read`, `actors:write`.

#### List actors
`GET /workspaces/:workspaceId/actors?limit=10&cursor=...` — scope: `actors:read`

Returns `{ actors: [...], nextCursor: "..." }`. Each actor includes: id, workspaceId, ownerId, name, slug, description, tags[], icon, status (DRAFT|PUBLISHED|DEPRECATED), inputSchema?, createdAt, updatedAt.

#### Create actor
`POST /workspaces/:workspaceId/actors` — scope: `actors:write`, role: OWNER/ADMIN/MEMBER

```json
{ "name": "My Actor", "slug": "my-actor", "description": "...", "tags": ["tag1"], "icon": "...", "inputSchema": { ... } }
```

#### Get actor
`GET /workspaces/:workspaceId/actors/:actorId`

#### Update actor
`PATCH /workspaces/:workspaceId/actors/:actorId` — ownership-gated

#### Delete actor
`DELETE /workspaces/:workspaceId/actors/:actorId` — ownership-gated. Returns `{ success: true }`.

#### List versions
`GET /workspaces/:workspaceId/actors/:actorId/versions`

Returns `{ versions: [{ id, actorId, version, inputSchema?, changelog?, createdAt }] }`

#### Transition lifecycle
`POST /workspaces/:workspaceId/actors/:actorId/transition`

Body: `{ "action": "publish|deprecate|republish", "changelog": "..." }`

Valid transitions: DRAFT→publish, PUBLISHED→deprecate, DEPRECATED→republish. Invalid returns 422.

### 4. Runs

#### Create run
`POST /runs` — scope: `runs:write`

```json
{ "actorId": "act_1", "workspaceId": "ws_1", "actorVersionId": "ver_1", "input": { ... } }
```

Response 201:
```json
{ "id": "run_1", "actorId": "act_1", "workspaceId": "ws_1", "status": "PENDING", "createdAt": "..." }
```

#### Get run
`GET /runs/:id` — scope: `runs:read`

#### Update run status
`PATCH /runs/:id` — scope: `runs:write`

Body: `{ "status": "RUNNING|SUCCEEDED|FAILED", "output": {...}, "errorMessage": "..." }`

#### Cancel run
`POST /runs/:id/cancel` — scope: `runs:write`

Returns `{ id, status: "CANCELED" }`. Kills child process if RUNNING.

#### List workspace runs
`GET /workspaces/:workspaceId/runs?limit=10&cursor=...` — scope: `runs:read`

Returns `{ runs: [...], nextCursor: "..." }`.

#### Get run logs
`GET /runs/:id/logs?limit=100&cursor=...` — scope: `runs:read`

Returns `{ logs: [...], nextCursor: "..." }`. Log entries include: id, runId, level (INFO|ERROR|WARN), message, metadata?, timestamp.

### Run statuses

`PENDING` → `RUNNING` → `SUCCEEDED` | `FAILED` | `CANCELED`

Runs with DRAFT actors are rejected (400). PUBLISHED and DEPRECATED actors can run.

### 5. Schedules

#### Create schedule
`POST /schedules` — scope: `schedules:write`

```json
{ "workspaceId": "ws_1", "actorId": "act_1", "cron": "0 * * * *", "input": {...}, "enabled": true }
```

Cron expression validated as 5-field (no seconds). Returns full Schedule object.

#### Get schedule
`GET /schedules/:id` — scope: `schedules:read`

#### List workspace schedules
`GET /workspaces/:workspaceId/schedules?limit=10&cursor=...` — scope: `schedules:read`

Returns `{ schedules: [...], nextCursor: "..." }`.

#### Update schedule
`PATCH /schedules/:id` — scope: `schedules:write`

Body: `{ "cron": "0 * * * *", "enabled": true, "input": {...}, "actorVersionId": "..." }` (all fields optional).

Schedule runner: background worker ticks every 10s, claims due schedules via optimistic lock, creates runs, advances recurring schedules, disables one-off schedules.

### 6. Storage

All storage routes under `/workspaces/:workspaceId/...`. Scopes: `storage:read`, `storage:write`.

#### Datasets

`GET /workspaces/:workspaceId/datasets?limit=10&cursor=...` — list
`POST /workspaces/:workspaceId/datasets` — create. Body: `{ name, slug }`
`GET /workspaces/:workspaceId/datasets/:datasetId` — detail with `_count.items`
`DELETE /workspaces/:workspaceId/datasets/:datasetId` — ownership-gated
`GET /workspaces/:workspaceId/datasets/:datasetId/items?limit=10&cursor=...` — list items
`POST /workspaces/:workspaceId/datasets/:datasetId/items` — add item. Body: `{ payload: {...}, sequence?: number }`
`GET /workspaces/:workspaceId/datasets/:datasetId/export` — export all items as downloadable JSON. Returns `{ items: [{ sequence, payload, createdAt }], dataset: { id, name } }` with `Content-Disposition: attachment` header.

#### Key-Value Stores

`GET /workspaces/:workspaceId/kv-stores?limit=10&cursor=...` — list
`POST /workspaces/:workspaceId/kv-stores` — create. Body: `{ name, slug }`
`GET /workspaces/:workspaceId/kv-stores/:storeId` — detail with `_count.records`
`DELETE /workspaces/:workspaceId/kv-stores/:storeId` — ownership-gated
`GET /workspaces/:workspaceId/kv-stores/:storeId/records?limit=10&cursor=...` — list records

#### Request Queues

`GET /workspaces/:workspaceId/request-queues?limit=10&cursor=...` — list
`POST /workspaces/:workspaceId/request-queues` — create. Body: `{ name, slug }`
`GET /workspaces/:workspaceId/request-queues/:queueId` — detail with `_count.items`
`DELETE /workspaces/:workspaceId/request-queues/:queueId` — ownership-gated
`GET /workspaces/:workspaceId/request-queues/:queueId/items?limit=10&cursor=...` — list items

### 7. Webhooks

#### List webhooks
`GET /workspaces/:workspaceId/webhooks?limit=10&cursor=...` — scope: `webhooks:read`

#### Create webhook
`POST /workspaces/:workspaceId/webhooks` — scope: `webhooks:write`, role: OWNER/ADMIN/MEMBER

```json
{ "actorId": "act_1", "eventTypes": "run.succeeded", "url": "https://example.com/hook", "secret": "...", "enabled": true }
```

#### Get webhook
`GET /workspaces/:workspaceId/webhooks/:webhookId` — scope: `webhooks:read`

#### Update webhook
`PATCH /workspaces/:workspaceId/webhooks/:webhookId` — ownership-gated

#### Delete webhook
`DELETE /workspaces/:workspaceId/webhooks/:webhookId` — ownership-gated

#### List delivery attempts
`GET /workspaces/:workspaceId/webhooks/:webhookId/attempts?limit=10&cursor=...` — scope: `webhooks:read`

Returns `{ attempts: [{ id, webhookId, eventType, status (PENDING|DELIVERING|RETRYING|SUCCEEDED|FAILED), attemptCount, requestUrl, responseStatusCode?, responseBody?, errorMessage?, nextRetryAt?, completedAt?, createdAt }] }`.

### Webhook event types

Webhooks are triggered on these lifecycle events (sent as `eventTypes` string on webhook creation):

- `run.created`
- `run.succeeded`
- `run.failed`
- `run.canceled`
- `run.status_changed`
- `marketplace.listed`
- `marketplace.approved`
- `marketplace.rejected`
- `marketplace.unpublished`

Delivery: HMAC-SHA256 signed if secret configured, 10s timeout, exponential backoff retry (60s×2^n, max 1h, max 5 attempts).

### 8. API Tokens

#### List tokens
`GET /workspaces/:workspaceId/api-tokens` — scope: `tokens:read`, role: OWNER/ADMIN/MEMBER

Returns `{ tokens: [{ id, label, createdAt, lastUsedAt?, revokedAt? }] }` (no tokenHash or scopes exposed).

#### Create token
`POST /workspaces/:workspaceId/api-tokens` — scope: `tokens:write`, role: OWNER/ADMIN/MEMBER

```json
{ "label": "my-token", "userId": "user_1", "scopes": ["runs:read", "runs:write"] }
```

If scopes omitted, defaults to read-only (7 scopes). MEMBER cannot use `workspace:write`.

Response 201:
```json
{ "id": "tok_1", "label": "my-token", "scopes": "runs:read,runs:write", "createdAt": "...", "token": "tok_abc123..." }
```
The raw token is returned only at creation.

#### Revoke token
`POST /workspaces/:workspaceId/api-tokens/:tokenId/revoke` — scope: `tokens:write`, ownership-gated

### 9. Events

#### List workspace events
`GET /workspaces/:workspaceId/events?limit=50&cursor=...&types=RUN_CREATED,RUN_SUCCEEDED` — scope: `runs:read`

Returns `{ events: [...], nextCursor: "..." }`. Types filter is comma-separated EventType enum values.

EventType enum: `RUN_CREATED`, `RUN_SUCCEEDED`, `RUN_FAILED`, `RUN_CANCELED`, `SCHEDULE_DISPATCHED`, `ACTOR_PUBLISHED`, `MARKETPLACE_LISTED`, `MARKETPLACE_APPROVED`, `MARKETPLACE_REJECTED`, `MARKETPLACE_UNPUBLISHED`.

### 10. Marketplace

Public browse routes (`GET /marketplace`, `GET /marketplace/:id`) have no auth.

#### Browse listings
`GET /marketplace?limit=20&cursor=...&category=...`

Returns only APPROVED listings. Includes nested actor info (name, slug, description, tags, icon, inputSchema).

#### Get listing detail
`GET /marketplace/:marketplaceId`

Returns listing with full actor info. 404 if UNPUBLISHED.

#### Publish listing
`POST /workspaces/:workspaceId/marketplace` — scope: `actors:write`, role: OWNER/ADMIN/MEMBER

Body: `{ "actorId": "act_1", "category": "web-scraping" }`

Actor must be PUBLISHED. Listing created in PENDING status. Emits MARKETPLACE_LISTED event + marketplace.listed webhook.

#### Approve listing
`POST /marketplace/:marketplaceId/approve` — scope: `actors:write`, workspace membership required

Only PENDING listings can be approved. Emits MARKETPLACE_APPROVED event + marketplace.approved webhook.

#### Reject listing
`POST /marketplace/:marketplaceId/reject` — scope: `actors:write`, workspace membership required

Only PENDING listings can be rejected. Emits MARKETPLACE_REJECTED event + marketplace.rejected webhook.

#### Unpublish listing
`POST /marketplace/:marketplaceId/unpublish` — scope: `actors:write`, workspace membership + publisher ownership required

Emits MARKETPLACE_UNPUBLISHED event + marketplace.unpublished webhook.

### 11. Billing

#### List plans
`GET /billing/plans` — public. Returns `{ plans: [{ id, name, description, priceCents, runLimit, storageMb, interval }] }`.

#### Get subscription
`GET /workspaces/:workspaceId/billing/subscription` — scope: `workspace:read`, role: OWNER/ADMIN/MEMBER

Returns `{ subscription: { id, workspaceId, planId, status, currentPeriodEnd, plan: {...} } }`.

#### Create subscription
`POST /workspaces/:workspaceId/billing/subscription` — scope: `workspace:write`, role: OWNER only

Body: `{ "planId": "plan_1" }`

#### Get usage
`GET /workspaces/:workspaceId/billing/usage` — scope: `workspace:read`, role: OWNER/ADMIN/MEMBER

Returns `{ records: [...], total: { runsUsed: 0, storageBytes: 0 } }`.

### 12. Admin

#### List workspaces (admin)
`GET /admin/workspaces` — scope: `workspace:write`. Returns `{ workspaces: [...] }`.

#### List users (admin)
`GET /admin/users` — scope: `workspace:write`. Returns `{ users: [{ id, email, name, createdAt }] }`.

## Not yet implemented (future scope)

- Task presets (saved execution recipes) — deferred post-MVP

## Contract alignment rules

- Frontend must not invent fields absent from backend contracts.
- Any contract change must update this file.
- Async APIs return immediate status; completed results are retrieved via GET /runs/:id.
