import { describe, it, expect } from "vitest";
import { greet, PLATFORM_NAME } from "../src/index.js";

describe("greet", () => {
  it("returns a greeting with the platform name", () => {
    const result = greet("World");
    expect(result).toBe(`Hello from ${PLATFORM_NAME}, World!`);
  });
});
