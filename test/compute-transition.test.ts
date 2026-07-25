import { describe, it, expect } from "vitest";
import { computeTransition, LIFECYCLE_ACTIONS, type LifecycleAction } from "../src/actor-lifecycle.js";

const STATUSES = ["DRAFT", "PUBLISHED", "DEPRECATED"] as const;

interface TestCase {
  status: string;
  action: LifecycleAction;
  expectedAllowed: boolean;
  expectedNextStatus?: string;
}

function runCases(cases: TestCase[]): void {
  for (const { status, action, expectedAllowed, expectedNextStatus } of cases) {
    const label = expectedAllowed ? `allowed → ${String(expectedNextStatus)}` : "denied";
    it(`${status} × ${action} → ${label}`, () => {
      const result = computeTransition(status, action);
      expect(result.allowed).toBe(expectedAllowed);
      if (expectedAllowed && expectedNextStatus) {
        const r = result as { allowed: true; nextStatus: string };
        expect(r.nextStatus).toBe(expectedNextStatus);
      }
      if (!expectedAllowed) {
        const r = result as { allowed: false; currentStatus: string; allowedActions: LifecycleAction[] };
        expect(r.currentStatus).toBe(status);
        expect(Array.isArray(r.allowedActions)).toBe(true);
      }
    });
  }
}

describe("computeTransition — valid transitions", () => {
  runCases([
    { status: "DRAFT", action: "publish", expectedAllowed: true, expectedNextStatus: "PUBLISHED" },
    { status: "PUBLISHED", action: "deprecate", expectedAllowed: true, expectedNextStatus: "DEPRECATED" },
    { status: "DEPRECATED", action: "republish", expectedAllowed: true, expectedNextStatus: "PUBLISHED" },
  ]);
});

describe("computeTransition — invalid transitions", () => {
  runCases([
    { status: "DRAFT", action: "deprecate", expectedAllowed: false },
    { status: "DRAFT", action: "republish", expectedAllowed: false },
    { status: "PUBLISHED", action: "publish", expectedAllowed: false },
    { status: "PUBLISHED", action: "republish", expectedAllowed: false },
    { status: "DEPRECATED", action: "publish", expectedAllowed: false },
    { status: "DEPRECATED", action: "deprecate", expectedAllowed: false },
  ]);
});

describe("computeTransition — edge cases", () => {
  it("returns denied for unknown status", () => {
    const result = computeTransition("UNKNOWN", "publish");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.allowedActions).toEqual([]);
    }
  });

  it("returns denied for empty status", () => {
    const result = computeTransition("", "publish");
    expect(result.allowed).toBe(false);
  });
});

describe("constants", () => {
  it("LIFECYCLE_ACTIONS has exactly 3 actions", () => {
    expect(LIFECYCLE_ACTIONS).toEqual(["publish", "deprecate", "republish"]);
  });

  it("STATUSES has exactly 3 statuses", () => {
    expect(STATUSES).toEqual(["DRAFT", "PUBLISHED", "DEPRECATED"]);
  });
});
