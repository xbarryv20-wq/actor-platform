import { describe, it, expect, vi, afterEach } from "vitest";
import {
  isRetriable,
  calculateNextRetry,
  MAX_RETRY_ATTEMPTS,
  RETRY_BASE_DELAY_MS,
  RETRY_MAX_DELAY_MS,
} from "../src/webhook-retry.js";
import type { DeliveryResult } from "../src/webhook-delivery.js";

describe("isRetriable", () => {
  it("retries network errors (statusCode null)", () => {
    const result: DeliveryResult = { statusCode: null, responseBody: null, errorMessage: "ECONNREFUSED" };
    expect(isRetriable(result)).toBe(true);
  });

  it("retries timeouts (statusCode null)", () => {
    const result: DeliveryResult = { statusCode: null, responseBody: null, errorMessage: "Timeout" };
    expect(isRetriable(result)).toBe(true);
  });

  it("retries 429 (Too Many Requests)", () => {
    const result: DeliveryResult = { statusCode: 429, responseBody: null, errorMessage: "HTTP 429" };
    expect(isRetriable(result)).toBe(true);
  });

  it("retries 500", () => {
    const result: DeliveryResult = { statusCode: 500, responseBody: null, errorMessage: "HTTP 500" };
    expect(isRetriable(result)).toBe(true);
  });

  it("retries 502", () => {
    const result: DeliveryResult = { statusCode: 502, responseBody: null, errorMessage: "HTTP 502" };
    expect(isRetriable(result)).toBe(true);
  });

  it("retries 503", () => {
    const result: DeliveryResult = { statusCode: 503, responseBody: null, errorMessage: "HTTP 503" };
    expect(isRetriable(result)).toBe(true);
  });

  it("does not retry 200", () => {
    const result: DeliveryResult = { statusCode: 200, responseBody: "ok", errorMessage: null };
    expect(isRetriable(result)).toBe(false);
  });

  it("does not retry 201", () => {
    const result: DeliveryResult = { statusCode: 201, responseBody: "created", errorMessage: null };
    expect(isRetriable(result)).toBe(false);
  });

  it("does not retry 204", () => {
    const result: DeliveryResult = { statusCode: 204, responseBody: "", errorMessage: null };
    expect(isRetriable(result)).toBe(false);
  });

  it("does not retry 301 (redirect)", () => {
    const result: DeliveryResult = { statusCode: 301, responseBody: null, errorMessage: "HTTP 301" };
    expect(isRetriable(result)).toBe(false);
  });

  it("does not retry 400", () => {
    const result: DeliveryResult = { statusCode: 400, responseBody: null, errorMessage: "HTTP 400" };
    expect(isRetriable(result)).toBe(false);
  });

  it("does not retry 401", () => {
    const result: DeliveryResult = { statusCode: 401, responseBody: null, errorMessage: "HTTP 401" };
    expect(isRetriable(result)).toBe(false);
  });

  it("does not retry 403", () => {
    const result: DeliveryResult = { statusCode: 403, responseBody: null, errorMessage: "HTTP 403" };
    expect(isRetriable(result)).toBe(false);
  });

  it("does not retry 404", () => {
    const result: DeliveryResult = { statusCode: 404, responseBody: null, errorMessage: "HTTP 404" };
    expect(isRetriable(result)).toBe(false);
  });

  it("does not retry 410 (gone)", () => {
    const result: DeliveryResult = { statusCode: 410, responseBody: null, errorMessage: "HTTP 410" };
    expect(isRetriable(result)).toBe(false);
  });

  it("does not retry 422", () => {
    const result: DeliveryResult = { statusCode: 422, responseBody: null, errorMessage: "HTTP 422" };
    expect(isRetriable(result)).toBe(false);
  });
});

describe("calculateNextRetry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when attemptCount >= MAX_RETRY_ATTEMPTS", () => {
    expect(calculateNextRetry(MAX_RETRY_ATTEMPTS)).toBeNull();
    expect(calculateNextRetry(MAX_RETRY_ATTEMPTS + 1)).toBeNull();
    expect(calculateNextRetry(10)).toBeNull();
  });

  it("returns a schedule when attemptCount < MAX_RETRY_ATTEMPTS", () => {
    const result = calculateNextRetry(1);
    expect(result).not.toBeNull();
    expect(result!.delayMs).toBeGreaterThan(0);
    expect(result!.nextRetryAt).toBeInstanceOf(Date);
    expect(result!.nextRetryAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("base delay for attempt 1 is approximately RETRY_BASE_DELAY_MS", () => {
    const result = calculateNextRetry(1)!;
    const lower = RETRY_BASE_DELAY_MS * 0.75;
    const upper = RETRY_BASE_DELAY_MS * 1.25;
    expect(result.delayMs).toBeGreaterThanOrEqual(lower);
    expect(result.delayMs).toBeLessThanOrEqual(upper);
  });

  it("attempt 2 delay is approximately 2x base", () => {
    const result = calculateNextRetry(2)!;
    const expected = RETRY_BASE_DELAY_MS * 2;
    const lower = expected * 0.75;
    const upper = expected * 1.25;
    expect(result.delayMs).toBeGreaterThanOrEqual(lower);
    expect(result.delayMs).toBeLessThanOrEqual(upper);
  });

  it("attempt 3 delay is approximately 4x base", () => {
    const result = calculateNextRetry(3)!;
    const expected = RETRY_BASE_DELAY_MS * 4;
    const lower = expected * 0.75;
    const upper = expected * 1.25;
    expect(result.delayMs).toBeGreaterThanOrEqual(lower);
    expect(result.delayMs).toBeLessThanOrEqual(upper);
  });

  it("attempt 4 delay is approximately 8x base", () => {
    const result = calculateNextRetry(4)!;
    const expected = RETRY_BASE_DELAY_MS * 8;
    const lower = expected * 0.75;
    const upper = expected * 1.25;
    expect(result.delayMs).toBeGreaterThanOrEqual(lower);
    expect(result.delayMs).toBeLessThanOrEqual(upper);
  });

  it("delay does not exceed RETRY_MAX_DELAY_MS", () => {
    for (let i = 1; i < MAX_RETRY_ATTEMPTS; i++) {
      const result = calculateNextRetry(i)!;
      expect(result.delayMs).toBeLessThanOrEqual(RETRY_MAX_DELAY_MS * 1.25);
    }
  });

  it("produces varying jitter across multiple calls", () => {
    const delays = new Set<number>();
    for (let i = 0; i < 50; i++) {
      delays.add(calculateNextRetry(1)!.delayMs);
    }
    expect(delays.size).toBeGreaterThan(1);
  });

  it("returns nextRetryAt in the future", () => {
    const result = calculateNextRetry(1)!;
    const now = Date.now();
    expect(result.nextRetryAt.getTime()).toBeGreaterThan(now);
  });
});
