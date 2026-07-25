import { describe, it, expect, vi, beforeEach } from "vitest";
import { app } from "../src/index.js";

const mockActorFindUnique = vi.fn();

const mockPrisma = {
  actor: { findUnique: mockActorFindUnique },
};

vi.mock("../src/config.js", () => ({
  getPrisma: vi.fn(() => mockPrisma),
  config: {
    port: 3000,
    serviceName: "actor-platform",
    version: "0.0.1",
  },
  checkDb: vi.fn(() => Promise.resolve({ ok: false })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /runs — DRAFT actor gating", () => {
  it("returns 400 with DRAFT error when actor status is DRAFT", async () => {
    mockActorFindUnique.mockResolvedValue({
      id: "actor-1",
      workspaceId: "ws-1",
      status: "DRAFT",
      inputSchema: null,
    });

    const res = await app.request("/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actorId: "actor-1", workspaceId: "ws-1" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Actor is in DRAFT state; only PUBLISHED or DEPRECATED actors can run");
    expect(mockActorFindUnique).toHaveBeenCalledTimes(1);
  });
});
