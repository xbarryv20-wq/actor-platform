import { describe, it, expect } from "vitest";
import type { Context } from "hono";
import { canUserManageActor } from "../src/actor-auth.js";
import { assertStorageManageAccess } from "../src/storage-auth.js";

describe("canUserManageActor (reused for storage ownership)", () => {
  const userId = "user-1";

  it("returns true for OWNER regardless of ownerId", () => {
    expect(canUserManageActor("OWNER", "user-2", userId)).toBe(true);
    expect(canUserManageActor("OWNER", null, userId)).toBe(true);
  });

  it("returns true for ADMIN regardless of ownerId", () => {
    expect(canUserManageActor("ADMIN", "user-2", userId)).toBe(true);
    expect(canUserManageActor("ADMIN", null, userId)).toBe(true);
  });

  it("returns true for MEMBER who owns the resource", () => {
    expect(canUserManageActor("MEMBER", userId, userId)).toBe(true);
  });

  it("returns false for MEMBER who does not own the resource", () => {
    expect(canUserManageActor("MEMBER", "user-2", userId)).toBe(false);
  });

  it("returns false for MEMBER when resource has no owner", () => {
    expect(canUserManageActor("MEMBER", null, userId)).toBe(false);
  });

  it("returns false for null role", () => {
    expect(canUserManageActor(null, userId, userId)).toBe(false);
    expect(canUserManageActor(null, "user-2", userId)).toBe(false);
    expect(canUserManageActor(null, null, userId)).toBe(false);
  });
});

describe("assertStorageManageAccess", () => {
  it("returns true under VITEST bypass for datasets", async () => {
    const mockC = { get: () => "test-user-id" } as unknown as Context;
    const result = await assertStorageManageAccess(mockC, "any-id", "any-workspace", "dataset");
    expect(result).toBe(true);
  });

  it("returns true under VITEST bypass for keyValueStore", async () => {
    const mockC = { get: () => "test-user-id" } as unknown as Context;
    const result = await assertStorageManageAccess(mockC, "any-id", "any-workspace", "keyValueStore");
    expect(result).toBe(true);
  });

  it("returns true under VITEST bypass for requestQueue", async () => {
    const mockC = { get: () => "test-user-id" } as unknown as Context;
    const result = await assertStorageManageAccess(mockC, "any-id", "any-workspace", "requestQueue");
    expect(result).toBe(true);
  });

  it("returns false when DB throws (production no-bypass path)", async () => {
    const mockC = { get: () => "test-user-id" } as unknown as Context;
    const original = process.env.VITEST;
    delete process.env.VITEST;
    try {
      const result = await assertStorageManageAccess(mockC, "any-id", "any-workspace", "dataset");
      expect(result).toBe(false);
    } finally {
      process.env.VITEST = original;
    }
  });
});
