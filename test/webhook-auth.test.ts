import { describe, it, expect } from "vitest";
import type { Context } from "hono";
import { assertWebhookManageAccess } from "../src/webhook-auth.js";

describe("assertWebhookManageAccess", () => {
  it("returns { allowed: true } under VITEST bypass", async () => {
    const mockC = { get: () => "test-user-id" } as unknown as Context;
    const result = await assertWebhookManageAccess(mockC, "any-id", "any-workspace");
    expect(result).toEqual({ allowed: true });
  });

  it("returns { allowed: false } when DB throws (production no-bypass path)", async () => {
    const mockC = { get: () => "test-user-id" } as unknown as Context;
    const original = process.env.VITEST;
    delete process.env.VITEST;
    try {
      const result = await assertWebhookManageAccess(mockC, "any-id", "any-workspace");
      expect(result).toEqual({ allowed: false });
    } finally {
      process.env.VITEST = original;
    }
  });

  it("returns { allowed: false } when no userId in context (production path)", async () => {
    const mockC = { get: () => undefined } as unknown as Context;
    const original = process.env.VITEST;
    delete process.env.VITEST;
    try {
      const result = await assertWebhookManageAccess(mockC, "any-id", "any-workspace");
      expect(result).toEqual({ allowed: false });
    } finally {
      process.env.VITEST = original;
    }
  });
});
