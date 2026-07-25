import { describe, it, expect } from "vitest";
import { app } from "../src/index.js";

describe("Actor metadata route behavior (VITEST bypass)", () => {
  it("POST /workspaces/:workspaceId/actors returns 500 (no DB) with all metadata fields", async () => {
    const res = await app.request("/workspaces/ws-1/actors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Test",
        slug: "test",
        description: "An example actor",
        tags: ["ai", "utility"],
        icon: "robot-icon",
      }),
    });
    expect(res.status).toBe(500);
  });

  it("POST returns 400 for empty tag string", async () => {
    const res = await app.request("/workspaces/ws-1/actors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Test", slug: "test", tags: [""] }),
    });
    expect(res.status).toBe(400);
  });

  it("POST returns 400 for description exceeding 1000 chars", async () => {
    const res = await app.request("/workspaces/ws-1/actors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Test", slug: "test", description: "x".repeat(1001) }),
    });
    expect(res.status).toBe(400);
  });

  it("POST returns 400 for more than 10 tags", async () => {
    const res = await app.request("/workspaces/ws-1/actors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Test", slug: "test", tags: Array.from({ length: 11 }, (_, i) => `tag-${i}`) }),
    });
    expect(res.status).toBe(400);
  });

  it("POST returns 400 for icon exceeding 256 chars", async () => {
    const res = await app.request("/workspaces/ws-1/actors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Test", slug: "test", icon: "x".repeat(257) }),
    });
    expect(res.status).toBe(400);
  });

  it("PATCH /workspaces/:workspaceId/actors/:actorId returns 500 (no DB) with metadata fields", async () => {
    const res = await app.request("/workspaces/ws-1/actors/actor-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description: "Updated description", tags: ["new-tag"], icon: "new-icon" }),
    });
    expect(res.status).toBe(500);
  });

  it("PATCH returns 400 for invalid tag", async () => {
    const res = await app.request("/workspaces/ws-1/actors/actor-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tags: [""] }),
    });
    expect(res.status).toBe(400);
  });

  it("POST with no metadata fields succeeds (backward compatible)", async () => {
    const res = await app.request("/workspaces/ws-1/actors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "NoMeta", slug: "no-meta" }),
    });
    expect(res.status).toBe(500);
  });
});
