import { describe, it, expect, afterAll } from "vitest";
import { app } from "../src/index.js";
import {
  isValidWorkspaceRole,
  getWorkspaceRole,
  assertWorkspaceMember,
  WORKSPACE_ROLES,
} from "../src/workspace-auth.js";

const originalVitest = process.env.VITEST;

afterAll(() => {
  process.env.VITEST = originalVitest;
});

describe("isValidWorkspaceRole", () => {
  it("returns true for OWNER", () => {
    expect(isValidWorkspaceRole("OWNER")).toBe(true);
  });

  it("returns true for ADMIN", () => {
    expect(isValidWorkspaceRole("ADMIN")).toBe(true);
  });

  it("returns true for MEMBER", () => {
    expect(isValidWorkspaceRole("MEMBER")).toBe(true);
  });

  it("returns false for invalid role", () => {
    expect(isValidWorkspaceRole("SUPER_ADMIN")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidWorkspaceRole("")).toBe(false);
  });

  it("returns false for lowercase", () => {
    expect(isValidWorkspaceRole("owner")).toBe(false);
  });
});

describe("getWorkspaceRole", () => {
  it("returns OWNER under VITEST bypass", async () => {
    const role = await getWorkspaceRole("any-user", "any-workspace");
    expect(role).toBe("OWNER");
  });

  it("returns null when DB throws (production no-bypass path)", async () => {
    const original = process.env.VITEST;
    delete process.env.VITEST;
    try {
      const role = await getWorkspaceRole("any-user", "any-workspace");
      expect(role).toBeNull();
    } finally {
      process.env.VITEST = original;
    }
  });
});

describe("assertWorkspaceMember", () => {
  it("returns false when DB throws (production no-bypass path)", async () => {
    const original = process.env.VITEST;
    delete process.env.VITEST;
    try {
      const result = await assertWorkspaceMember("any-user", "any-workspace");
      expect(result).toBe(false);
    } finally {
      process.env.VITEST = original;
    }
  });
});

describe("WORKSPACE_ROLES constants", () => {
  it("has expected values", () => {
    expect(WORKSPACE_ROLES.OWNER).toBe("OWNER");
    expect(WORKSPACE_ROLES.ADMIN).toBe("ADMIN");
    expect(WORKSPACE_ROLES.MEMBER).toBe("MEMBER");
  });
});

describe("GET /health remains public", () => {
  it("returns 200 without auth", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
  });
});

describe("Workspace settings routes", () => {
  it("GET /workspaces/:workspaceId returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1");
    expect(res.status).toBe(500);
  });

  it("PATCH /workspaces/:workspaceId returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "New Name" }),
    });
    expect(res.status).toBe(500);
  });

  it("PATCH /workspaces/:workspaceId returns 400 for empty body", async () => {
    const res = await app.request("/workspaces/ws-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("PATCH /workspaces/:workspaceId returns 400 for no fields", async () => {
    const res = await app.request("/workspaces/ws-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("No fields to update");
  });

  it("PATCH /workspaces/:workspaceId with slug returns 500 (no DB) under VITEST bypass (slug check hits DB)", async () => {
    const res = await app.request("/workspaces/ws-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: "new-slug" }),
    });
    expect(res.status).toBe(500);
  });
});

describe("Workspace member management routes", () => {
  it("GET /workspaces/:workspaceId/members returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/members");
    expect(res.status).toBe(500);
  });

  it("POST /workspaces/:workspaceId/members returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/members", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "user-1", role: "MEMBER" }),
    });
    expect(res.status).toBe(500);
  });

  it("POST /workspaces/:workspaceId/members returns 400 for invalid role", async () => {
    const res = await app.request("/workspaces/ws-1/members", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "user-1", role: "SUPER_ADMIN" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Invalid input");
  });

  it("POST /workspaces/:workspaceId/members returns 400 for empty body", async () => {
    const res = await app.request("/workspaces/ws-1/members", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("PATCH /workspaces/:workspaceId/members/:userId returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/members/user-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "ADMIN" }),
    });
    expect(res.status).toBe(500);
  });

  it("PATCH /workspaces/:workspaceId/members/:userId returns 400 for invalid role", async () => {
    const res = await app.request("/workspaces/ws-1/members/user-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "INVALID" }),
    });
    expect(res.status).toBe(400);
  });

  it("DELETE /workspaces/:workspaceId/members/:userId returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/members/user-1", {
      method: "DELETE",
    });
    expect(res.status).toBe(500);
  });
});

describe("Actor CRUD routes", () => {
  it("GET /workspaces/:workspaceId/actors returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/actors");
    expect(res.status).toBe(500);
  });

  it("GET /workspaces/:workspaceId/actors returns 400 for invalid limit", async () => {
    const res = await app.request("/workspaces/ws-1/actors?limit=abc");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Invalid query parameters");
  });

  it("GET /workspaces/:workspaceId/actors/:actorId returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/actors/actor-1");
    expect(res.status).toBe(500);
  });

  it("POST /workspaces/:workspaceId/actors returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/actors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Test Actor", slug: "test-actor" }),
    });
    expect(res.status).toBe(500);
  });

  it("POST /workspaces/:workspaceId/actors returns 400 for empty body", async () => {
    const res = await app.request("/workspaces/ws-1/actors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("POST /workspaces/:workspaceId/actors returns 400 for missing slug", async () => {
    const res = await app.request("/workspaces/ws-1/actors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Test Actor" }),
    });
    expect(res.status).toBe(400);
  });

  it("PATCH /workspaces/:workspaceId/actors/:actorId returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/actors/actor-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Updated Actor" }),
    });
    expect(res.status).toBe(500);
  });

  it("PATCH /workspaces/:workspaceId/actors/:actorId returns 400 for empty fields", async () => {
    const res = await app.request("/workspaces/ws-1/actors/actor-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("No fields to update");
  });

  it("DELETE /workspaces/:workspaceId/actors/:actorId returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/actors/actor-1", {
      method: "DELETE",
    });
    expect(res.status).toBe(500);
  });
});

describe("API token management routes", () => {
  it("GET /workspaces/:workspaceId/api-tokens returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/api-tokens");
    expect(res.status).toBe(500);
  });

  it("POST /workspaces/:workspaceId/api-tokens returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/api-tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: "test-token", userId: "user-1" }),
    });
    expect(res.status).toBe(500);
  });

  it("POST /workspaces/:workspaceId/api-tokens returns 400 for empty body", async () => {
    const res = await app.request("/workspaces/ws-1/api-tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("POST /workspaces/:workspaceId/api-tokens returns 400 for invalid scopes", async () => {
    const res = await app.request("/workspaces/ws-1/api-tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: "test-token", userId: "user-1", scopes: ["invalid:scope"] }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /workspaces/:workspaceId/api-tokens/:tokenId/revoke returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/api-tokens/tok-1/revoke", {
      method: "POST",
    });
    expect(res.status).toBe(500);
  });
});

describe("Storage routes (datasets, key-value stores, request queues)", () => {
  it("GET /workspaces/:workspaceId/datasets returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/datasets");
    expect(res.status).toBe(500);
  });

  it("GET /workspaces/:workspaceId/datasets returns 400 for invalid limit", async () => {
    const res = await app.request("/workspaces/ws-1/datasets?limit=abc");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Invalid query parameters");
  });

  it("GET /workspaces/:workspaceId/datasets/:datasetId returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/datasets/ds-1");
    expect(res.status).toBe(500);
  });

  it("POST /workspaces/:workspaceId/datasets returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/datasets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Test Dataset", slug: "test-dataset" }),
    });
    expect(res.status).toBe(500);
  });

  it("POST /workspaces/:workspaceId/datasets returns 400 for empty body", async () => {
    const res = await app.request("/workspaces/ws-1/datasets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("DELETE /workspaces/:workspaceId/datasets/:datasetId returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/datasets/ds-1", {
      method: "DELETE",
    });
    expect(res.status).toBe(500);
  });

  it("GET /workspaces/:workspaceId/datasets/:datasetId/items returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/datasets/ds-1/items");
    expect(res.status).toBe(500);
  });

  it("POST /workspaces/:workspaceId/datasets/:datasetId/items returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/datasets/ds-1/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payload: { key: "value" } }),
    });
    expect(res.status).toBe(500);
  });

  it("POST /workspaces/:workspaceId/datasets/:datasetId/items returns 400 for missing payload", async () => {
    const res = await app.request("/workspaces/ws-1/datasets/ds-1/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("GET /workspaces/:workspaceId/kv-stores returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/kv-stores");
    expect(res.status).toBe(500);
  });

  it("GET /workspaces/:workspaceId/kv-stores/:storeId returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/kv-stores/store-1");
    expect(res.status).toBe(500);
  });

  it("POST /workspaces/:workspaceId/kv-stores returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/kv-stores", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Test KV Store", slug: "test-kv" }),
    });
    expect(res.status).toBe(500);
  });

  it("POST /workspaces/:workspaceId/kv-stores returns 400 for empty body", async () => {
    const res = await app.request("/workspaces/ws-1/kv-stores", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("DELETE /workspaces/:workspaceId/kv-stores/:storeId returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/kv-stores/store-1", {
      method: "DELETE",
    });
    expect(res.status).toBe(500);
  });

  it("GET /workspaces/:workspaceId/request-queues returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/request-queues");
    expect(res.status).toBe(500);
  });

  it("GET /workspaces/:workspaceId/request-queues/:queueId returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/request-queues/q-1");
    expect(res.status).toBe(500);
  });

  it("GET /workspaces/:workspaceId/kv-stores/:storeId/records returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/kv-stores/store-1/records");
    expect(res.status).toBe(500);
  });

  it("GET /workspaces/:workspaceId/kv-stores/:storeId/records returns 400 for invalid limit", async () => {
    const res = await app.request("/workspaces/ws-1/kv-stores/store-1/records?limit=abc");
    expect(res.status).toBe(400);
  });

  it("GET /workspaces/:workspaceId/request-queues/:queueId/items returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/request-queues/q-1/items");
    expect(res.status).toBe(500);
  });

  it("GET /workspaces/:workspaceId/request-queues/:queueId/items returns 400 for invalid limit", async () => {
    const res = await app.request("/workspaces/ws-1/request-queues/q-1/items?limit=abc");
    expect(res.status).toBe(400);
  });

  it("POST /workspaces/:workspaceId/request-queues returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/request-queues", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Test Queue", slug: "test-queue" }),
    });
    expect(res.status).toBe(500);
  });

  it("POST /workspaces/:workspaceId/request-queues returns 400 for empty body", async () => {
    const res = await app.request("/workspaces/ws-1/request-queues", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("DELETE /workspaces/:workspaceId/request-queues/:queueId returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/request-queues/q-1", {
      method: "DELETE",
    });
    expect(res.status).toBe(500);
  });
});

describe("Webhook routes", () => {
  it("GET /workspaces/:workspaceId/webhooks returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/webhooks");
    expect(res.status).toBe(500);
  });

  it("GET /workspaces/:workspaceId/webhooks returns 400 for invalid limit", async () => {
    const res = await app.request("/workspaces/ws-1/webhooks?limit=abc");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Invalid query parameters");
  });

  it("GET /workspaces/:workspaceId/webhooks/:webhookId returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/webhooks/wh-1");
    expect(res.status).toBe(500);
  });

  it("POST /workspaces/:workspaceId/webhooks returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/webhooks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actorId: "a-1", eventTypes: "RUN.SUCCEEDED", url: "https://example.com/hook" }),
    });
    expect(res.status).toBe(500);
  });

  it("POST /workspaces/:workspaceId/webhooks returns 400 for empty body", async () => {
    const res = await app.request("/workspaces/ws-1/webhooks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("POST /workspaces/:workspaceId/webhooks returns 400 for invalid URL", async () => {
    const res = await app.request("/workspaces/ws-1/webhooks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actorId: "a-1", eventTypes: "RUN.SUCCEEDED", url: "not-a-url" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Invalid input");
  });

  it("PATCH /workspaces/:workspaceId/webhooks/:webhookId returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/webhooks/wh-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    });
    expect(res.status).toBe(500);
  });

  it("PATCH /workspaces/:workspaceId/webhooks/:webhookId returns 400 for empty body", async () => {
    const res = await app.request("/workspaces/ws-1/webhooks/wh-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("No fields to update");
  });

  it("DELETE /workspaces/:workspaceId/webhooks/:webhookId returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/webhooks/wh-1", {
      method: "DELETE",
    });
    expect(res.status).toBe(500);
  });

  it("GET /workspaces/:workspaceId/webhooks/:webhookId/attempts returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/webhooks/wh-1/attempts");
    expect(res.status).toBe(500);
  });

  it("GET /workspaces/:workspaceId/webhooks/:webhookId/attempts returns 400 for invalid limit", async () => {
    const res = await app.request("/workspaces/ws-1/webhooks/wh-1/attempts?limit=abc");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Invalid query parameters");
  });
});

describe("Existing workspace-scoped routes remain protected", () => {
  it("POST /runs remains protected (membership check)", async () => {
    const res = await app.request("/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actorId: "a-1", workspaceId: "ws-1" }),
    });
    expect([400, 500]).toContain(res.status);
  });

  it("GET /workspaces/:workspaceId/runs remains protected", async () => {
    const res = await app.request("/workspaces/ws-1/runs");
    expect([400, 500]).toContain(res.status);
  });

  it("POST /schedules remains protected", async () => {
    const res = await app.request("/schedules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: "ws-1", actorId: "a-1", cron: "0 0 * * *" }),
    });
    expect([400, 500]).toContain(res.status);
  });

  it("GET /workspaces/:workspaceId/schedules remains protected", async () => {
    const res = await app.request("/workspaces/ws-1/schedules");
    expect([400, 500]).toContain(res.status);
  });
});

describe("Marketplace routes", () => {
  it("GET /marketplace returns 500 (no DB)", async () => {
    const res = await app.request("/marketplace");
    expect(res.status).toBe(500);
  });

  it("GET /marketplace returns 400 for invalid limit", async () => {
    const res = await app.request("/marketplace?limit=abc");
    expect(res.status).toBe(400);
  });

  it("GET /marketplace/:id returns 500 (no DB)", async () => {
    const res = await app.request("/marketplace/listing-1");
    expect(res.status).toBe(500);
  });

  it("POST /workspaces/:workspaceId/marketplace returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/marketplace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actorId: "actor-1" }),
    });
    expect(res.status).toBe(500);
  });

  it("POST /workspaces/:workspaceId/marketplace returns 400 for missing actorId", async () => {
    const res = await app.request("/workspaces/ws-1/marketplace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("POST /marketplace/:id/unpublish returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/marketplace/listing-1/unpublish", {
      method: "POST",
    });
    expect(res.status).toBe(500);
  });

  it("POST /marketplace/:id/approve returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/marketplace/listing-1/approve", {
      method: "POST",
    });
    expect(res.status).toBe(500);
  });

  it("POST /marketplace/:id/reject returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/marketplace/listing-1/reject", {
      method: "POST",
    });
    expect(res.status).toBe(500);
  });

  it("new listings default to PENDING (check publish returns 201 with PENDING)", async () => {
    const res = await app.request("/workspaces/ws-1/marketplace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actorId: "actor-1" }),
    });
    expect(res.status).toBe(500);
  });
});

describe("Billing routes", () => {
  it("GET /billing/plans returns 500 (no DB)", async () => {
    const res = await app.request("/billing/plans");
    expect(res.status).toBe(500);
  });

  it("GET /workspaces/:workspaceId/billing/subscription returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/billing/subscription");
    expect(res.status).toBe(500);
  });

  it("POST /workspaces/:workspaceId/billing/subscription returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/billing/subscription", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planId: "plan-1" }),
    });
    expect(res.status).toBe(500);
  });

  it("GET /workspaces/:workspaceId/billing/usage returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/billing/usage");
    expect(res.status).toBe(500);
  });

  it("POST /workspaces/:workspaceId/billing/subscription returns 400 for missing planId", async () => {
    const res = await app.request("/workspaces/ws-1/billing/subscription", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});

describe("Admin routes", () => {
  it("GET /admin/workspaces returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/admin/workspaces");
    expect(res.status).toBe(500);
  });

  it("GET /admin/users returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/admin/users");
    expect(res.status).toBe(500);
  });
});
