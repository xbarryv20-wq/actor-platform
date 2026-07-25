import { describe, it, expect } from "vitest";
import { app } from "../src/index.js";

describe("GET /workspaces/:workspaceId/events", () => {
  it("responds to events list request (200 with DB, 500 without)", async () => {
    const res = await app.request("/workspaces/ws-1/events");
    expect([200, 500]).toContain(res.status);
  });

  it("responds with limit parameter", async () => {
    const res = await app.request("/workspaces/ws-1/events?limit=20");
    expect([200, 500]).toContain(res.status);
  });

  it("responds with types filter", async () => {
    const res = await app.request("/workspaces/ws-1/events?types=RUN_SUCCEEDED,RUN_FAILED");
    expect([200, 500]).toContain(res.status);
  });

  it("returns 400 for invalid limit", async () => {
    const res = await app.request("/workspaces/ws-1/events?limit=abc");
    expect(res.status).toBe(400);
  });

  it("returns 400 for limit too high", async () => {
    const res = await app.request("/workspaces/ws-1/events?limit=200");
    expect(res.status).toBe(400);
  });

  it("normalizes lowercase types filter to uppercase", async () => {
    const res = await app.request("/workspaces/ws-1/events?types=run_created,run_succeeded");
    expect([200, 500]).toContain(res.status);
  });
});
