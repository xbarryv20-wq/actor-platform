import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createWebhookRetryScheduler, DEFAULT_RETRY_INTERVAL_MS } from "../src/webhook-scheduler.js";

const mockProcessRetryAttempts = vi.hoisted(() => vi.fn());

vi.mock("../src/webhook-worker.js", () => ({
  processRetryAttempts: mockProcessRetryAttempts,
}));

beforeEach(() => {
  vi.useFakeTimers();
  mockProcessRetryAttempts.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createWebhookRetryScheduler", () => {
  it("starts in stopped state", () => {
    const scheduler = createWebhookRetryScheduler();
    expect(scheduler.isRunning()).toBe(false);
  });

  it("calls processRetryAttempts immediately on start", () => {
    const scheduler = createWebhookRetryScheduler();
    scheduler.start();
    expect(mockProcessRetryAttempts).toHaveBeenCalledTimes(1);
  });

  it("calls processRetryAttempts on each interval tick", () => {
    const scheduler = createWebhookRetryScheduler({ intervalMs: 1000 });
    scheduler.start();
    expect(mockProcessRetryAttempts).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    expect(mockProcessRetryAttempts).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(1000);
    expect(mockProcessRetryAttempts).toHaveBeenCalledTimes(3);
  });

  it("does not call processRetryAttempts after stop", () => {
    const scheduler = createWebhookRetryScheduler({ intervalMs: 1000 });
    scheduler.start();
    expect(mockProcessRetryAttempts).toHaveBeenCalledTimes(1);

    scheduler.stop();
    vi.advanceTimersByTime(5000);
    expect(mockProcessRetryAttempts).toHaveBeenCalledTimes(1);
  });

  it("isRunning returns true after start, false after stop", () => {
    const scheduler = createWebhookRetryScheduler();
    expect(scheduler.isRunning()).toBe(false);

    scheduler.start();
    expect(scheduler.isRunning()).toBe(true);

    scheduler.stop();
    expect(scheduler.isRunning()).toBe(false);
  });

  it("start is idempotent — does not create multiple intervals", () => {
    const scheduler = createWebhookRetryScheduler({ intervalMs: 1000 });
    scheduler.start();
    scheduler.start();
    scheduler.start();

    vi.advanceTimersByTime(1000);
    expect(mockProcessRetryAttempts).toHaveBeenCalledTimes(2);
  });

  it("stop is idempotent — safe to call when not running", () => {
    const scheduler = createWebhookRetryScheduler();
    scheduler.stop();
    scheduler.stop();
    expect(scheduler.isRunning()).toBe(false);
  });

  it("uses default interval when none provided", () => {
    const scheduler = createWebhookRetryScheduler();
    scheduler.start();
    scheduler.stop();
    expect(DEFAULT_RETRY_INTERVAL_MS).toBe(5000);
  });

  it("does not crash when processRetryAttempts throws", async () => {
    mockProcessRetryAttempts.mockRejectedValue(new Error("DB gone"));

    const scheduler = createWebhookRetryScheduler({ intervalMs: 1000 });
    scheduler.start();

    await vi.advanceTimersByTimeAsync(1000);
    expect(mockProcessRetryAttempts).toHaveBeenCalledTimes(2);
  });

  it("logs when attempts are processed", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    mockProcessRetryAttempts.mockResolvedValue({ processed: 3, succeeded: 2, failed: 0, retried: 1 });

    const scheduler = createWebhookRetryScheduler({ intervalMs: 1000 });
    scheduler.start();

    await vi.advanceTimersByTimeAsync(0);
    expect(consoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Processed 3 attempts (2 succeeded, 0 failed, 1 retried)"),
    );

    consoleLog.mockRestore();
  });

  it("does not log when no attempts processed", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    mockProcessRetryAttempts.mockResolvedValue({ processed: 0, succeeded: 0, failed: 0, retried: 0 });

    const scheduler = createWebhookRetryScheduler({ intervalMs: 1000 });
    scheduler.start();

    await vi.advanceTimersByTimeAsync(0);
    expect(consoleLog).not.toHaveBeenCalled();

    consoleLog.mockRestore();
  });

  it("logs errors on tick failure", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockProcessRetryAttempts.mockRejectedValue(new Error("Network error"));

    const scheduler = createWebhookRetryScheduler({ intervalMs: 1000 });
    scheduler.start();

    await vi.advanceTimersByTimeAsync(0);
    expect(consoleError).toHaveBeenCalledWith(
      "[webhook-scheduler] Tick failed:",
      expect.any(Error),
    );

    consoleError.mockRestore();
  });
});
