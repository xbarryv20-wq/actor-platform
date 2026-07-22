import { describe, it, expect } from "vitest";
import { app } from "../src/index.js";

interface HealthBody {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  db: { status: string; error?: string };
}

describe("health endpoint", () => {
  it("returns 200 with expected shape", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);

    const body = (await res.json()) as HealthBody;
    expect(body.status).toBe("ok");
    expect(body.service).toBe("actor-platform");
    expect(body.version).toBe("0.0.1");
    expect(body.timestamp).toBeTruthy();
    expect(body.db.status).toMatch(/^(connected|disconnected)$/);
  });
});
