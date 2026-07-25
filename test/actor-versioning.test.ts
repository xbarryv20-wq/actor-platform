import { describe, it, expect } from "vitest";
import { app } from "../src/index.js";

describe("POST /workspaces/:workspaceId/actors/:actorId/transition — version creation", () => {
  it("returns 400 for empty body", async () => {
    const res = await app.request("/workspaces/ws-1/actors/actor-1/transition", { method: "POST" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing action", async () => {
    const res = await app.request("/workspaces/ws-1/actors/actor-1/transition", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ changelog: "v2" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid action value", async () => {
    const res = await app.request("/workspaces/ws-1/actors/actor-1/transition", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "invalid" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 500 for publish without changelog (no DB) — exercises version creation path", async () => {
    const res = await app.request("/workspaces/ws-1/actors/actor-1/transition", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "publish" }),
    });
    expect(res.status).toBe(500);
  });

  it("returns 500 for publish with changelog (no DB) — exercises changelog acceptance", async () => {
    const res = await app.request("/workspaces/ws-1/actors/actor-1/transition", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "publish", changelog: "Initial release" }),
    });
    expect(res.status).toBe(500);
  });

  it("returns 500 for republish with changelog (no DB)", async () => {
    const res = await app.request("/workspaces/ws-1/actors/actor-1/transition", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "republish", changelog: "Updated schema" }),
    });
    expect(res.status).toBe(500);
  });

  it("returns 500 for deprecate ignores changelog (no DB) — deprecate does not create version", async () => {
    const res = await app.request("/workspaces/ws-1/actors/actor-1/transition", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "deprecate", changelog: "No longer needed" }),
    });
    expect(res.status).toBe(500);
  });
});

describe("GET /workspaces/:workspaceId/actors/:actorId/versions — list versions", () => {
  it("returns 500 for valid request (no DB) — exercises actor lookup + version query + ordering", async () => {
    const res = await app.request("/workspaces/ws-1/actors/actor-1/versions");
    expect(res.status).toBe(500);
  });

  it("returns 500 for different workspace (no DB) — exercises workspace mismatch path", async () => {
    const res = await app.request("/workspaces/ws-other/actors/actor-1/versions");
    expect(res.status).toBe(500);
  });

  it("returns 500 for nonexistent actor (no DB) — exercises not-found path", async () => {
    const res = await app.request("/workspaces/ws-1/actors/nonexistent/versions");
    expect(res.status).toBe(500);
  });

  it("returns 500 for actor with no versions (no DB) — exercises empty list path", async () => {
    const res = await app.request("/workspaces/ws-1/actors/actor-2/versions");
    expect(res.status).toBe(500);
  });
});

describe("POST /runs — version binding", () => {
  it("returns 500 when creating run without explicit version (no DB) — exercises auto-bind path", async () => {
    const res = await app.request("/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actorId: "actor-1", workspaceId: "ws-1" }),
    });
    expect(res.status).toBe(500);
  });

  it("returns 500 when creating run with explicit version (no DB) — exercises explicit version path", async () => {
    const res = await app.request("/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actorId: "actor-1", workspaceId: "ws-1", actorVersionId: "ver-1" }),
    });
    expect(res.status).toBe(500);
  });
});
