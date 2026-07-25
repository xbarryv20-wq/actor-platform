import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { errorResponse, handleError } from "../src/errors.js";
import { app } from "../src/index.js";

describe("errorResponse", () => {
  it("returns JSON with error message and status code", async () => {
    const { Hono } = await import("hono");
    const s = new Hono();
    s.get("/test", (c) => errorResponse(c, 400, "Bad request"));
    const res = await s.request("/test");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Bad request" });
  });

  it("includes details when provided", async () => {
    const { Hono } = await import("hono");
    const s = new Hono();
    s.get("/test", (c) => errorResponse(c, 422, "Invalid", { field: "name" }));
    const res = await s.request("/test");
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "Invalid", details: { field: "name" } });
  });

  it("works with 500 status", async () => {
    const { Hono } = await import("hono");
    const s = new Hono();
    s.get("/test", (c) => errorResponse(c, 500, "Internal server error"));
    const res = await s.request("/test");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });
});

describe("handleError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 500 with standard error message", async () => {
    const { Hono } = await import("hono");
    const s = new Hono();
    s.onError((err, c) => handleError(err, c));
    s.get("/crash", () => { throw new Error("boom"); });
    const res = await s.request("/crash");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });

  it("logs the error to console.error", async () => {
    const { Hono } = await import("hono");
    const s = new Hono();
    s.onError((err, c) => handleError(err, c));
    s.get("/crash", () => { throw new Error("boom"); });
    await s.request("/crash");
    expect(console.error).toHaveBeenCalledWith("[unhandled]", expect.any(Error));
  });

  it("global onError in main app does not break normal requests", async () => {
    const res = await app.request("/console");
    expect(res.status).toBe(200);
  });
});
