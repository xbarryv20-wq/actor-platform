import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createScheduleScheduler, DEFAULT_SCHEDULE_INTERVAL_MS } from "../src/schedule-scheduler.js";

const mockProcessDueSchedules = vi.hoisted(() => vi.fn());
const mockRecoverStaleSchedules = vi.hoisted(() => vi.fn());

vi.mock("../src/schedule-runner.js", () => ({
  processDueSchedules: mockProcessDueSchedules,
  recoverStaleSchedules: mockRecoverStaleSchedules,
}));

beforeEach(() => {
  vi.useFakeTimers();
  mockProcessDueSchedules.mockReset();
  mockProcessDueSchedules.mockResolvedValue({ processed: 0, runsCreated: 0, errors: 0 });
  mockRecoverStaleSchedules.mockReset();
  mockRecoverStaleSchedules.mockResolvedValue(0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createScheduleScheduler", () => {
  it("starts in stopped state", () => {
    const scheduler = createScheduleScheduler();
    expect(scheduler.isRunning()).toBe(false);
  });

  it("calls recoverStaleSchedules and processDueSchedules immediately on start", async () => {
    const scheduler = createScheduleScheduler();
    scheduler.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockRecoverStaleSchedules).toHaveBeenCalledTimes(1);
    expect(mockProcessDueSchedules).toHaveBeenCalledTimes(1);
  });

  it("calls processDueSchedules on each interval tick", async () => {
    const scheduler = createScheduleScheduler({ intervalMs: 1000 });
    scheduler.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockProcessDueSchedules).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(mockProcessDueSchedules).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1000);
    expect(mockProcessDueSchedules).toHaveBeenCalledTimes(3);
  });

  it("does not call processDueSchedules after stop", async () => {
    const scheduler = createScheduleScheduler({ intervalMs: 1000 });
    scheduler.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockProcessDueSchedules).toHaveBeenCalledTimes(1);

    scheduler.stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockProcessDueSchedules).toHaveBeenCalledTimes(1);
  });

  it("isRunning returns true after start, false after stop", () => {
    const scheduler = createScheduleScheduler();
    expect(scheduler.isRunning()).toBe(false);

    scheduler.start();
    expect(scheduler.isRunning()).toBe(true);

    scheduler.stop();
    expect(scheduler.isRunning()).toBe(false);
  });

  it("start is idempotent — does not create multiple intervals", async () => {
    const scheduler = createScheduleScheduler({ intervalMs: 1000 });
    scheduler.start();
    scheduler.start();
    scheduler.start();
    await vi.advanceTimersByTimeAsync(0);

    await vi.advanceTimersByTimeAsync(1000);
    expect(mockProcessDueSchedules).toHaveBeenCalledTimes(2);
  });

  it("stop is idempotent — safe to call when not running", () => {
    const scheduler = createScheduleScheduler();
    scheduler.stop();
    scheduler.stop();
    expect(scheduler.isRunning()).toBe(false);
  });

  it("uses default interval when none provided", () => {
    const scheduler = createScheduleScheduler();
    scheduler.start();
    scheduler.stop();
    expect(DEFAULT_SCHEDULE_INTERVAL_MS).toBe(10000);
  });

  it("does not crash when processDueSchedules throws", async () => {
    mockProcessDueSchedules.mockRejectedValue(new Error("DB gone"));

    const scheduler = createScheduleScheduler({ intervalMs: 1000 });
    scheduler.start();

    await vi.advanceTimersByTimeAsync(1000);
    expect(mockProcessDueSchedules).toHaveBeenCalledTimes(2);
  });

  it("logs when schedules are processed", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    mockProcessDueSchedules.mockResolvedValue({ processed: 3, runsCreated: 2, errors: 1 });

    const scheduler = createScheduleScheduler({ intervalMs: 1000 });
    scheduler.start();

    await vi.advanceTimersByTimeAsync(0);
    expect(consoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Processed 3 schedules (2 runs created, 1 errors)"),
    );

    consoleLog.mockRestore();
  });

  it("does not log when no schedules processed", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    mockProcessDueSchedules.mockResolvedValue({ processed: 0, runsCreated: 0, errors: 0 });

    const scheduler = createScheduleScheduler({ intervalMs: 1000 });
    scheduler.start();

    await vi.advanceTimersByTimeAsync(0);
    expect(consoleLog).not.toHaveBeenCalled();

    consoleLog.mockRestore();
  });

  it("logs errors on tick failure", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockProcessDueSchedules.mockRejectedValue(new Error("Network error"));

    const scheduler = createScheduleScheduler({ intervalMs: 1000 });
    scheduler.start();

    await vi.advanceTimersByTimeAsync(0);
    expect(consoleError).toHaveBeenCalledWith(
      "[schedule-scheduler] Tick failed:",
      expect.any(Error),
    );

    consoleError.mockRestore();
  });

  it("does not crash when recoverStaleSchedules throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockRecoverStaleSchedules.mockRejectedValue(new Error("Stale recovery error"));
    mockProcessDueSchedules.mockResolvedValue({ processed: 0, runsCreated: 0, errors: 0 });

    const scheduler = createScheduleScheduler({ intervalMs: 1000 });
    scheduler.start();

    await vi.advanceTimersByTimeAsync(0);
    expect(mockProcessDueSchedules).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "[schedule-scheduler] Tick failed:",
      expect.any(Error),
    );

    consoleError.mockRestore();
  });
});
