# API_CONTRACTS.md

## Purpose

This document defines the baseline API contracts for the platform. These contracts should be treated as stable product interfaces once implemented and should guide both backend and frontend development.

## API design principles

- REST-first.
- JSON request/response bodies unless file download/export is required.
- Auth required for protected resources.
- Tenant scoping enforced server-side.
- Consistent resource identifiers.
- Explicit pagination for collection endpoints.
- Explicit error envelopes.
- Async execution flows should return a run resource, not wait for full completion by default.[cite:44][cite:55][cite:56]

## Common headers

### Authenticated requests
- `Authorization: Bearer <token>` for API token or session-backed API access.[cite:55]

### Content negotiation
- `Content-Type: application/json`
- `Accept: application/json`

## Error envelope

Suggested shape:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have access to this workspace resource.",
    "details": null,
    "requestId": "req_123"
  }
}
```

## Pagination envelope

Suggested shape:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 0,
  "nextCursor": null
}
```

## Core resources

### 1. Actors

#### Create actor
`POST /api/actors`

Request:

```json
{
  "workspaceId": "ws_123",
  "name": "Competitor Price Monitor",
  "slug": "competitor-price-monitor",
  "description": "Tracks product pages and extracts price changes."
}
```

Response:

```json
{
  "id": "act_123",
  "workspaceId": "ws_123",
  "name": "Competitor Price Monitor",
  "slug": "competitor-price-monitor",
  "description": "Tracks product pages and extracts price changes.",
  "status": "ACTIVE",
  "createdAt": "2026-07-22T21:00:00Z"
}
```

#### List actors
`GET /api/actors?workspaceId=ws_123`

Returns paginated actor collection.

#### Get actor
`GET /api/actors/{actorId}`

Returns actor detail including latest version metadata.

### 2. Actor versions

#### Create actor version
`POST /api/actors/{actorId}/versions`

Request:

```json
{
  "versionTag": "v1.0.0",
  "runtimeType": "playwright-node",
  "inputSchema": {
    "type": "object",
    "properties": {
      "startUrls": { "type": "array" }
    }
  },
  "outputSchema": {
    "type": "object"
  }
}
```

Response returns created version resource.

### 3. Task presets

Saved execution recipes should support a task-like pattern where input and run defaults are preserved for repeated manual or scheduled execution.[cite:53]

#### Create task preset
`POST /api/task-presets`

Request:

```json
{
  "workspaceId": "ws_123",
  "actorId": "act_123",
  "actorVersionId": "ver_123",
  "name": "daily-monitor-default",
  "inputPayload": {
    "startUrls": ["https://example.com"]
  },
  "defaultTimeoutSecs": 900
}
```

### 4. Actor runs

#### Start run (async)
`POST /api/runs`

Request:

```json
{
  "workspaceId": "ws_123",
  "actorId": "act_123",
  "actorVersionId": "ver_123",
  "taskPresetId": null,
  "input": {
    "startUrls": ["https://example.com"]
  }
}
```

Response:

```json
{
  "id": "run_123",
  "workspaceId": "ws_123",
  "actorId": "act_123",
  "actorVersionId": "ver_123",
  "status": "QUEUED",
  "defaultDatasetId": null,
  "createdAt": "2026-07-22T21:05:00Z"
}
```

This contract follows the common actor-platform pattern where execution is initiated and tracked asynchronously rather than blocking until completion.[cite:44][cite:55][cite:56]

#### Get run
`GET /api/runs/{runId}`

Response should include:
- run metadata
- lifecycle state
- timestamps
- output references
- error summary if failed

#### List runs
`GET /api/runs?workspaceId=ws_123&actorId=act_123`

#### Cancel run
`POST /api/runs/{runId}/cancel`

Response returns updated run state or accepted cancellation request.

#### Get run logs
`GET /api/runs/{runId}/logs`

Returns ordered log entries with pagination or stream mode later.

### 5. Datasets

Structured outputs should be retrievable as dedicated storage resources.[cite:42][cite:88]

#### Get dataset
`GET /api/datasets/{datasetId}`

#### List dataset items
`GET /api/datasets/{datasetId}/items`

Response:

```json
{
  "items": [
    {
      "id": "dsi_1",
      "itemIndex": 0,
      "payload": {
        "url": "https://example.com/p/1",
        "price": 19.99
      }
    }
  ],
  "page": 1,
  "pageSize": 100,
  "total": 1,
  "nextCursor": null
}
```

#### Export dataset
`GET /api/datasets/{datasetId}/export?format=json`

Formats may later include `json`, `csv`, and other export options, reflecting common dataset export workflows.[cite:42][cite:88][cite:55]

### 6. Key-value stores

#### Get key-value store
`GET /api/key-value-stores/{storeId}`

#### Put record
`PUT /api/key-value-stores/{storeId}/records/{key}`

#### Get record
`GET /api/key-value-stores/{storeId}/records/{key}`

### 7. Request queues

#### Create request queue
`POST /api/request-queues`

#### Add request item
`POST /api/request-queues/{queueId}/items`

#### List request items
`GET /api/request-queues/{queueId}/items`

### 8. Schedules

Schedules should support cron-like recurring execution against actors or task presets.[cite:86][cite:53]

#### Create schedule
`POST /api/schedules`

Request:

```json
{
  "workspaceId": "ws_123",
  "name": "daily-competitor-monitor",
  "cronExpression": "0 6 * * *",
  "timezone": "UTC",
  "targetType": "TASK_PRESET",
  "targetTaskPresetId": "tsk_123",
  "enabled": true
}
```

#### List schedules
`GET /api/schedules?workspaceId=ws_123`

#### Update schedule
`PATCH /api/schedules/{scheduleId}`

#### Toggle schedule
`POST /api/schedules/{scheduleId}/enable`
`POST /api/schedules/{scheduleId}/disable`

### 9. Webhooks

Webhooks should support event-driven orchestration when key lifecycle events occur.[cite:89]

#### Create webhook
`POST /api/webhooks`

Request:

```json
{
  "workspaceId": "ws_123",
  "name": "notify-on-success",
  "eventType": "RUN.SUCCEEDED",
  "targetUrl": "https://example.com/hooks/apify-like",
  "enabled": true
}
```

#### List webhooks
`GET /api/webhooks?workspaceId=ws_123`

#### Test webhook
`POST /api/webhooks/{webhookId}/test`

### 10. API tokens

#### Create token
`POST /api/api-tokens`

Request:

```json
{
  "workspaceId": "ws_123",
  "label": "n8n integration",
  "scopes": ["runs:create", "runs:read", "datasets:read"]
}
```

Response should return the plaintext token only once.

#### Revoke token
`POST /api/api-tokens/{tokenId}/revoke`

### 11. Marketplace listings

#### Publish listing
`POST /api/marketplace/listings`

#### List public listings
`GET /api/marketplace/listings`

#### Get listing
`GET /api/marketplace/listings/{listingId}`

## Status and event contracts

### Run statuses
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

### Webhook event types
Suggested values:
- RUN.CREATED
- RUN.STARTED
- RUN.SUCCEEDED
- RUN.FAILED
- RUN.ABORTED
- DATASET.CREATED
- SCHEDULE.TRIGGERED

## Contract alignment rules

- Frontend must not invent fields absent from backend contracts.
- Backend must not return undocumented fields that frontend begins to depend on implicitly.
- Any contract change must update this file and relevant acceptance criteria.
- Async APIs must be explicit about whether they return immediate status, completed result, or output references.[cite:44][cite:55][cite:56]

## Verification expectations

For every implemented endpoint, verify at minimum:
- authenticated success path
- unauthenticated or unauthorized path
- invalid input path
- tenant isolation behavior where relevant
- persistence behavior where relevant
- response contract shape
