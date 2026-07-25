import { describe, it, expect } from "vitest";
import type { Context } from "hono";
import { app } from "../src/index.js";
import { canUserManageActor, assertActorManageAccess } from "../src/actor-auth.js";

describe("canUserManageActor", () => {
  const userId = "user-1";

  it("returns true for OWNER regardless of actor owner", () => {
    expect(canUserManageActor("OWNER", "user-2", userId)).toBe(true);
    expect(canUserManageActor("OWNER", null, userId)).toBe(true);
    expect(canUserManageActor("OWNER", userId, userId)).toBe(true);
  });

  it("returns true for ADMIN regardless of actor owner", () => {
    expect(canUserManageActor("ADMIN", "user-2", userId)).toBe(true);
    expect(canUserManageActor("ADMIN", null, userId)).toBe(true);
  });

  it("returns true for MEMBER who owns the actor", () => {
    expect(canUserManageActor("MEMBER", userId, userId)).toBe(true);
  });

  it("returns false for MEMBER who does not own the actor", () => {
    expect(canUserManageActor("MEMBER", "user-2", userId)).toBe(false);
  });

  it("returns false for MEMBER when actor has no owner", () => {
    expect(canUserManageActor("MEMBER", null, userId)).toBe(false);
  });

  it("returns false for null role", () => {
    expect(canUserManageActor(null, userId, userId)).toBe(false);
    expect(canUserManageActor(null, "user-2", userId)).toBe(false);
    expect(canUserManageActor(null, null, userId)).toBe(false);
  });
});

describe("assertActorManageAccess", () => {
  it("returns true under VITEST bypass", async () => {
    const mockC = { get: () => "test-user-id" } as unknown as Context;
    const result = await assertActorManageAccess(mockC, "any-actor-id", "any-workspace");
    expect(result).toBe(true);
  });

  it("returns false when DB throws (production no-bypass path)", async () => {
    const mockC = { get: () => "test-user-id" } as unknown as Context;
    const original = process.env.VITEST;
    delete process.env.VITEST;
    try {
      const result = await assertActorManageAccess(mockC, "any-actor-id", "any-workspace");
      expect(result).toBe(false);
    } finally {
      process.env.VITEST = original;
    }
  });
});

describe("Actor ownership route behavior", () => {
  it("POST /workspaces/:workspaceId/actors returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/actors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Test Actor", slug: "test-actor" }),
    });
    expect(res.status).toBe(500);
  });

  it("PATCH /workspaces/:workspaceId/actors/:actorId returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/actors/actor-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
    });
    expect(res.status).toBe(500);
  });

  it("DELETE /workspaces/:workspaceId/actors/:actorId returns 500 (no DB) under VITEST bypass", async () => {
    const res = await app.request("/workspaces/ws-1/actors/actor-1", {
      method: "DELETE",
    });
    expect(res.status).toBe(500);
  });
});
