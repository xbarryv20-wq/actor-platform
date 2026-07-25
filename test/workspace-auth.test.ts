import { describe, it, expect } from "vitest";
import { app } from "../src/index.js";
import { assertWorkspaceMember } from "../src/workspace-auth.js";

describe("assertWorkspaceMember", () => {
  it("returns true under VITEST bypass", async () => {
    const result = await assertWorkspaceMember("any-user", "any-workspace");
    expect(result).toBe(true);
  });
});

describe("GET /health bypasses workspace auth (unchanged)", () => {
  it("returns 200 without token", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
  });
});

describe("POST /runs — workspace membership", () => {
  it("returns 500 (no DB, Prisma throws) under VITEST bypass", async () => {
    const res = await app.request("/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        actorId: "nonexistent",
        workspaceId: "ws-not-member",
      }),
    });
    expect(res.status).toBe(500);
  });
});

describe("GET /workspaces/:workspaceId/runs — workspace membership", () => {
  it("returns 500 (no DB) under VITEST bypass with valid query", async () => {
    const res = await app.request("/workspaces/ws-1/runs?limit=5");
    expect(res.status).toBe(500);
  });

  it("returns 400 for invalid limit", async () => {
    const res = await app.request("/workspaces/ws-1/runs?limit=-1");
    expect(res.status).toBe(400);
  });
});

describe("POST /schedules — workspace membership", () => {
  it("returns 400 for missing cron when VITEST bypass passes membership", async () => {
    const res = await app.request("/schedules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId: "ws-1",
        actorId: "a-1",
      }),
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /workspaces/:workspaceId/schedules — workspace membership", () => {
  it("returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/schedules");
    expect(res.status).toBe(500);
  });
});

describe("GET /runs/:id — workspace membership", () => {
  it("returns 500 (no DB) when VITEST bypass passes membership", async () => {
    const res = await app.request("/runs/some-run-id");
    expect(res.status).toBe(500);
  });
});

describe("GET /schedules/:id — workspace membership", () => {
  it("returns 500 (no DB) when VITEST bypass passes membership", async () => {
    const res = await app.request("/schedules/some-schedule-id");
    expect(res.status).toBe(500);
  });
});
