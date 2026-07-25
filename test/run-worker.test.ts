import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { processPendingRuns, createRunWorkerScheduler, DEFAULT_RUN_WORKER_INTERVAL_MS } from "../src/run-worker.js";

const mockFindMany = vi.hoisted(() => vi.fn());
const mockClaimAndExecuteRun = vi.hoisted(() => vi.fn());

vi.mock("../src/config.js", () => ({
  getPrisma: vi.fn(() => ({
    actorRun: {
      findMany: mockFindMany,
    },
  })),
}));

vi.mock("../src/run-executor.js", () => ({
  claimAndExecuteRun: mockClaimAndExecuteRun,
}));

vi.mock("../src/run-logs.js", () => ({
  createLogEntry: vi.fn(),
}));

beforeEach(() => {
  vi.useFakeTimers();
  mockFindMany.mockReset();
  mockClaimAndExecuteRun.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("processPendingRuns", () => {
  it("processes pending runs", async () => {
    mockFindMany.mockResolvedValue([
      { id: "run-1" },
      { id: "run-2" },
    ]);
    mockClaimAndExecuteRun
      .mockResolvedValueOnce({ succeeded: true, errorMessage: null })
      .mockResolvedValueOnce({ succeeded: false, errorMessage: "fail" });

    const result = await processPendingRuns();

    expect(result.processed).toBe(2);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
      }),
    );
  });

  it("returns zeros when no pending runs", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await processPendingRuns();

    expect(result.processed).toBe(0);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("respects custom batch size", async () => {
    mockFindMany.mockResolvedValue([]);
    mockFindMany.mockResolvedValue([]);

    await processPendingRuns({ batchSize: 3 });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 }),
    );
  });

  it("handles all runs succeeding", async () => {
    mockFindMany.mockResolvedValue([
      { id: "run-1" },
      { id: "run-2" },
      { id: "run-3" },
    ]);
    mockClaimAndExecuteRun.mockResolvedValue({ succeeded: true, errorMessage: null });

    const result = await processPendingRuns();

    expect(result.processed).toBe(3);
    expect(result.succeeded).toBe(3);
    expect(result.failed).toBe(0);
  });
});

describe("createRunWorkerScheduler", () => {
  it("starts in stopped state", () => {
    const scheduler = createRunWorkerScheduler();
    expect(scheduler.isRunning()).toBe(false);
  });

  it("calls processPendingRuns immediately on start", () => {
    mockFindMany.mockResolvedValue([]);
    const scheduler = createRunWorkerScheduler({ intervalMs: 1000 });
    scheduler.start();
    expect(mockFindMany).toHaveBeenCalled();
  });

  it("polls on interval", () => {
    mockFindMany.mockResolvedValue([]);
    const scheduler = createRunWorkerScheduler({ intervalMs: 1000 });
    scheduler.start();
    expect(mockFindMany).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    expect(mockFindMany).toHaveBeenCalledTimes(2);
  });

  it("stops polling after stop", () => {
    mockFindMany.mockResolvedValue([]);
    const scheduler = createRunWorkerScheduler({ intervalMs: 1000 });
    scheduler.start();
    scheduler.stop();
    vi.advanceTimersByTime(5000);
    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });

  it("isRunning reflects state", () => {
    const scheduler = createRunWorkerScheduler();
    expect(scheduler.isRunning()).toBe(false);
    scheduler.start();
    expect(scheduler.isRunning()).toBe(true);
    scheduler.stop();
    expect(scheduler.isRunning()).toBe(false);
  });

  it("start is idempotent", () => {
    mockFindMany.mockResolvedValue([]);
    const scheduler = createRunWorkerScheduler({ intervalMs: 1000 });
    scheduler.start();
    scheduler.start();
    scheduler.start();
    vi.advanceTimersByTime(1000);
    expect(mockFindMany).toHaveBeenCalledTimes(2);
  });

  it("has correct default interval", () => {
    expect(DEFAULT_RUN_WORKER_INTERVAL_MS).toBe(5000);
  });

  it("survives tick errors", async () => {
    mockFindMany.mockRejectedValue(new Error("DB gone"));
    const scheduler = createRunWorkerScheduler({ intervalMs: 1000 });
    scheduler.start();

    await vi.advanceTimersByTimeAsync(1000);
    expect(mockFindMany).toHaveBeenCalledTimes(2);
  });
});
