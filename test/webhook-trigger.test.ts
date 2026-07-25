import { describe, it, expect } from "vitest";
import { triggerWebhooks } from "../src/webhook-trigger.js";

describe("triggerWebhooks", () => {
  it("bypasses under VITEST and returns zero triggered", async () => {
    const result = await triggerWebhooks({
      eventType: "run.succeeded",
      workspaceId: "ws-1",
      actorId: "actor-1",
      payload: { id: "run-1" },
    });
    expect(result).toEqual({ triggered: 0, queuedForRetry: 0 });
  });
});
