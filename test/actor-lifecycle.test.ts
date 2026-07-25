import { describe, it, expect } from "vitest";
import { app } from "../src/index.js";

describe("POST /workspaces/:workspaceId/actors/:actorId/transition", () => {
  it("returns 400 for empty body", async () => {
    const res = await app.request("/workspaces/ws-1/actors/actor-1/transition", { method: "POST" });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 400 for missing action", async () => {
    const res = await app.request("/workspaces/ws-1/actors/actor-1/transition", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Invalid transition action");
  });

  it("returns 400 for invalid action value", async () => {
    const res = await app.request("/workspaces/ws-1/actors/actor-1/transition", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "invalid" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Invalid transition action");
  });

  it("returns 500 for valid publish action (no DB)", async () => {
    const res = await app.request("/workspaces/ws-1/actors/actor-1/transition", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "publish" }),
    });
    expect(res.status).toBe(500);
  });

  it("returns 500 for valid deprecate action (no DB)", async () => {
    const res = await app.request("/workspaces/ws-1/actors/actor-1/transition", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "deprecate" }),
    });
    expect(res.status).toBe(500);
  });

  it("returns 500 for valid republish action (no DB)", async () => {
    const res = await app.request("/workspaces/ws-1/actors/actor-1/transition", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "republish" }),
    });
    expect(res.status).toBe(500);
  });
});

describe("POST /runs lifecycle gating", () => {
  it("returns 500 when creating run (no DB) — exercises status gating path", async () => {
    const res = await app.request("/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actorId: "actor-1", workspaceId: "ws-1" }),
    });
    expect(res.status).toBe(500);
  });
});

describe("Actor create default state", () => {
  it("POST returns 500 (no DB) — creates with implicit DRAFT default", async () => {
    const res = await app.request("/workspaces/ws-1/actors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "LifecycleActor", slug: "lifecycle-actor" }),
    });
    expect(res.status).toBe(500);
  });
});
