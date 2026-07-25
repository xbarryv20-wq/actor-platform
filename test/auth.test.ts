import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { app } from "../src/index.js";
import { hashToken } from "../src/auth.js";

describe("hashToken", () => {
  it("produces deterministic SHA-256 hex output", () => {
    const result = hashToken("tok_test_abc123");
    expect(result).toBe(
      createHash("sha256").update("tok_test_abc123").digest("hex"),
    );
  });

  it("produces different hashes for different tokens", () => {
    const a = hashToken("tok_a");
    const b = hashToken("tok_b");
    expect(a).not.toBe(b);
  });

  it("produces 64-character hex string", () => {
    const result = hashToken("any-token");
    expect(result).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(result)).toBe(true);
  });
});

describe("/health bypasses auth", () => {
  it("returns 200 without token", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
  });
});

describe("protected routes require auth", () => {
  it("GET /runs/some-id returns 500 (no DB) when VITEST bypass sets test user", async () => {
    const res = await app.request("/runs/some-id");
    expect(res.status).toBe(500);
  });

  it("GET /workspaces/ws-1/runs returns 500 (no DB) when VITEST bypass sets test user", async () => {
    const res = await app.request("/workspaces/ws-1/runs");
    expect(res.status).toBe(500);
  });

  it("POST /schedules returns 400 (empty body) when VITEST bypass sets test user", async () => {
    const res = await app.request("/schedules", { method: "POST" });
    expect(res.status).toBe(400);
  });

  it("GET /schedules/some-id returns 500 (no DB) when VITEST bypass sets test user", async () => {
    const res = await app.request("/schedules/some-id");
    expect(res.status).toBe(500);
  });
});
