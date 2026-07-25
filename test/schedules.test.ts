import { describe, it, expect } from "vitest";
import { app } from "../src/index.js";

describe("POST /schedules", () => {
  it("returns 400 for empty body", async () => {
    const res = await app.request("/schedules", { method: "POST" });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 400 for missing required fields", async () => {
    const res = await app.request("/schedules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string; details: unknown };
    expect(body.error).toBe("Invalid input");
    expect(body.details).toBeDefined();
  });

  it("returns 400 for missing workspaceId", async () => {
    const res = await app.request("/schedules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actorId: "a-1", cron: "0 0 * * *" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing actorId", async () => {
    const res = await app.request("/schedules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: "ws-1", cron: "0 0 * * *" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing cron", async () => {
    const res = await app.request("/schedules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: "ws-1", actorId: "a-1" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid cron expression", async () => {
    const res = await app.request("/schedules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: "ws-1", actorId: "a-1", cron: "not-a-cron" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Invalid input");
  });

  it("returns 400 for cron with wrong number of fields", async () => {
    const res = await app.request("/schedules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: "ws-1", actorId: "a-1", cron: "0 0 * * * *" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for cron with out-of-range values", async () => {
    const res = await app.request("/schedules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: "ws-1", actorId: "a-1", cron: "60 0 * * *" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty strings", async () => {
    const res = await app.request("/schedules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: "", actorId: "", cron: "" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /schedules/:id", () => {
  it("returns 500 when schedule lookup fails (no DB)", async () => {
    const res = await app.request("/schedules/nonexistent-id");
    expect(res.status).toBe(500);
  });
});

describe("GET /workspaces/:workspaceId/schedules", () => {
  it("returns 500 when list query fails (no DB)", async () => {
    const res = await app.request("/workspaces/ws-nonexistent/schedules");
    expect(res.status).toBe(500);
  });

  it("returns 400 for invalid limit", async () => {
    const res = await app.request("/workspaces/ws-1/schedules?limit=-1");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("limit must be a positive integer");
  });

  it("returns 400 for non-numeric limit", async () => {
    const res = await app.request("/workspaces/ws-1/schedules?limit=abc");
    expect(res.status).toBe(400);
  });

  it("returns 500 with valid limit (no DB)", async () => {
    const res = await app.request("/workspaces/ws-1/schedules?limit=5");
    expect(res.status).toBe(500);
  });

  it("returns 500 with cursor (no DB)", async () => {
    const res = await app.request("/workspaces/ws-1/schedules?cursor=some-cursor");
    expect(res.status).toBe(500);
  });
});

