import { describe, it, expect } from "vitest";
import { app } from "../src/index.js";

describe("POST /runs", () => {
  it("returns 400 for empty body", async () => {
    const res = await app.request("/runs", { method: "POST" });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 400 for missing required fields", async () => {
    const res = await app.request("/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string; details: unknown };
    expect(body.error).toBe("Invalid input");
    expect(body.details).toBeDefined();
  });

  it("returns 400 for missing actorId", async () => {
    const res = await app.request("/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: "ws-1" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing workspaceId", async () => {
    const res = await app.request("/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actorId: "actor-1" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty strings", async () => {
    const res = await app.request("/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actorId: "", workspaceId: "" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /runs/:id", () => {
  it("returns 500 when run lookup fails (no DB)", async () => {
    const res = await app.request("/runs/nonexistent-id");
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Internal server error");
  });
});

describe("PATCH /runs/:id", () => {
  it("returns 400 for empty body", async () => {
    const res = await app.request("/runs/run-1", { method: "PATCH" });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 400 for invalid status value", async () => {
    const res = await app.request("/runs/run-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "INVALID" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing status field", async () => {
    const res = await app.request("/runs/run-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ output: {} }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 500 when run update fails (no DB)", async () => {
    const res = await app.request("/runs/nonexistent-id", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "RUNNING" }),
    });
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Internal server error");
  });

  it("returns 400 when status is CANCELED (use /cancel endpoint)", async () => {
    const res = await app.request("/runs/run-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "CANCELED" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string; details: unknown };
    expect(body.error).toBe("Invalid input");
    expect(body.details).toBeDefined();
  });
});

describe("POST /runs/:id/cancel", () => {
  it("returns 500 when run lookup fails (no DB)", async () => {
    const res = await app.request("/runs/cancel-me/cancel", { method: "POST" });
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Internal server error");
  });
});

describe("GET /workspaces/:workspaceId/runs", () => {
  it("returns 400 for invalid limit (non-numeric)", async () => {
    const res = await app.request("/workspaces/ws-1/runs?limit=abc");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Invalid query parameters");
  });

  it("returns 400 for limit below range", async () => {
    const res = await app.request("/workspaces/ws-1/runs?limit=0");
    expect(res.status).toBe(400);
  });

  it("returns 400 for limit above range", async () => {
    const res = await app.request("/workspaces/ws-1/runs?limit=101");
    expect(res.status).toBe(400);
  });

  it("returns 500 when list query fails (no DB)", async () => {
    const res = await app.request("/workspaces/ws-1/runs");
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Internal server error");
  });
});
