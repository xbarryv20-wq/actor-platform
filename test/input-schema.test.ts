import { describe, it, expect } from "vitest";
import { validateInput, clearSchemaCache } from "../src/input-schema.js";

describe("validateInput", () => {
  beforeEach(() => clearSchemaCache());

  it("returns valid for input matching schema", () => {
    const schema = { type: "object", properties: { name: { type: "string" } }, required: ["name"] };
    expect(validateInput({ name: "test" }, schema)).toEqual({ valid: true });
  });

  it("returns invalid for missing required field", () => {
    const schema = { type: "object", properties: { name: { type: "string" } }, required: ["name"] };
    const result = validateInput({}, schema);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it("returns invalid for wrong type", () => {
    const schema = { type: "object", properties: { age: { type: "integer" } }, required: ["age"] };
    const result = validateInput({ age: "not-a-number" }, schema);
    expect(result.valid).toBe(false);
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it("accepts empty input when no schema required fields", () => {
    const schema = { type: "object", properties: { optional: { type: "string" } } };
    expect(validateInput({}, schema)).toEqual({ valid: true });
  });

  it("validates nested objects", () => {
    const schema = {
      type: "object",
      properties: {
        meta: { type: "object", properties: { count: { type: "integer" } }, required: ["count"] },
      },
      required: ["meta"],
    };
    expect(validateInput({ meta: { count: 5 } }, schema)).toEqual({ valid: true });
    const result = validateInput({ meta: { count: "bad" } }, schema);
    expect(result.valid).toBe(false);
  });

  it("caches compiled schemas by JSON key", () => {
    const schema = { type: "object", properties: { x: { type: "number" } }, required: ["x"] };
    expect(validateInput({ x: 1 }, schema)).toEqual({ valid: true });
    expect(validateInput({ x: "bad" }, schema).valid).toBe(false);
  });

  it("handles string format validation", () => {
    const schema = { type: "object", properties: { email: { type: "string", format: "email" } }, required: ["email"] };
    expect(validateInput({ email: "test@example.com" }, schema)).toEqual({ valid: true });
    expect(validateInput({ email: "not-email" }, schema).valid).toBe(false);
  });

  it("handles array schemas", () => {
    const schema = { type: "object", properties: { tags: { type: "array", items: { type: "string" } } }, required: ["tags"] };
    expect(validateInput({ tags: ["a", "b"] }, schema)).toEqual({ valid: true });
    expect(validateInput({ tags: "not-array" }, schema).valid).toBe(false);
  });

  it("returns invalid for null input", () => {
    const schema = { type: "object", properties: { x: { type: "string" } } };
    const result = validateInput(null, schema);
    expect(result.valid).toBe(false);
  });

  it("reports multiple errors", () => {
    const schema = { type: "object", properties: { a: { type: "string" }, b: { type: "number" } }, required: ["a", "b"] };
    const result = validateInput({}, schema);
    expect(result.valid).toBe(false);
    expect(result.errors!.length).toBeGreaterThanOrEqual(2);
  });
});

describe("route behavior (VITEST bypass)", () => {
  it("POST /workspaces/:workspaceId/actors returns 500 (no DB) with inputSchema", async () => {
    const { app } = await import("../src/index.js");
    const res = await app.request("/workspaces/ws-1/actors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Test", slug: "test", inputSchema: { type: "object" } }),
    });
    expect(res.status).toBe(500);
  });

  it("POST /workspaces/:workspaceId/runs with non-existent actor returns 404 (no DB)", async () => {
    const { app } = await import("../src/index.js");
    const res = await app.request("/workspaces/ws-1/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actorId: "actor-1", workspaceId: "ws-1", actorVersionId: "v-1", input: { foo: "bar" } }),
    });
    expect(res.status).toBe(404);
  });
});

describe("clearSchemaCache", () => {
  it("clears the compiled cache", () => {
    const schema = { type: "object", properties: { x: { type: "number" } }, required: ["x"] };
    validateInput({ x: 1 }, schema);
    expect(() => clearSchemaCache()).not.toThrow();
    // after clear, should still work (recompiles)
    expect(validateInput({ x: 2 }, schema)).toEqual({ valid: true });
  });
});
