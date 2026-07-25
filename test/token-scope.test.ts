import { describe, it, expect } from "vitest";
import { hasScope, validateScopes, DEFAULT_SCOPES, ALL_SCOPES, MEMBER_ALLOWED_SCOPES, SCOPES } from "../src/token-scope.js";

describe("hasScope", () => {
  it("returns true when exact scope is present", () => {
    expect(hasScope("actors:read,actors:write", "actors:read")).toBe(true);
  });

  it("returns true when scope is first in list", () => {
    expect(hasScope("actors:read,runs:read", "actors:read")).toBe(true);
  });

  it("returns true when scope is last in list", () => {
    expect(hasScope("runs:read,actors:read", "actors:read")).toBe(true);
  });

  it("returns true for single scope", () => {
    expect(hasScope("actors:read", "actors:read")).toBe(true);
  });

  it("returns false when scope is absent", () => {
    expect(hasScope("actors:read,runs:read", "storage:write")).toBe(false);
  });

  it("returns false for empty scope string", () => {
    expect(hasScope("", "actors:read")).toBe(false);
  });

  it("handles whitespace around scopes", () => {
    expect(hasScope(" actors:read , runs:read ", "actors:read")).toBe(true);
  });

  it("does not match partial scope prefix", () => {
    expect(hasScope("actors:read", "actors")).toBe(false);
  });
});

describe("validateScopes", () => {
  it("returns empty array for all valid scopes", () => {
    const result = validateScopes([...ALL_SCOPES]);
    expect(result).toEqual([]);
  });

  it("returns invalid scopes when some are unknown", () => {
    const result = validateScopes(["actors:read", "invalid:scope"]);
    expect(result).toEqual(["invalid:scope"]);
  });

  it("returns all inputs when none are valid", () => {
    const result = validateScopes(["bad:one", "bad:two"]);
    expect(result).toEqual(["bad:one", "bad:two"]);
  });

  it("returns empty array for empty input", () => {
    const result = validateScopes([]);
    expect(result).toEqual([]);
  });

  it("is case-insensitive", () => {
    const result = validateScopes(["ACTORS:READ", "Runs:Write"]);
    expect(result).toEqual([]);
  });
});

describe("DEFAULT_SCOPES", () => {
  it("contains only read scopes (least-privilege default)", () => {
    const writeScopes = DEFAULT_SCOPES.filter((s) => s.endsWith(":write"));
    expect(writeScopes).toEqual([]);
    expect(DEFAULT_SCOPES.length).toBeGreaterThan(0);
  });
});

describe("ALL_SCOPES", () => {
  it("contains all defined scopes", () => {
    const expected = Object.values(SCOPES).sort();
    const actual = [...ALL_SCOPES].sort();
    expect(actual).toEqual(expected);
  });

  it("contains 14 scopes", () => {
    expect(ALL_SCOPES).toHaveLength(14);
  });
});

describe("MEMBER_ALLOWED_SCOPES", () => {
  it("contains exactly 13 scopes (all except workspace:write)", () => {
    expect(MEMBER_ALLOWED_SCOPES).toHaveLength(13);
  });

  it("includes all read scopes", () => {
    const readScopes = ALL_SCOPES.filter((s) => s.endsWith(":read"));
    for (const s of readScopes) {
      expect(MEMBER_ALLOWED_SCOPES).toContain(s);
    }
  });

  it("includes write scopes except workspace:write", () => {
    const writeScopes = ALL_SCOPES.filter((s) => s.endsWith(":write") && s !== "workspace:write");
    for (const s of writeScopes) {
      expect(MEMBER_ALLOWED_SCOPES).toContain(s);
    }
  });

  it("does not include workspace:write", () => {
    expect(MEMBER_ALLOWED_SCOPES).not.toContain(SCOPES.WORKSPACE_WRITE);
  });
});
