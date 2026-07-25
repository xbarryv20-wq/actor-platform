import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeNextRun,
  processDueSchedules,
  recoverStaleSchedules,
  SCHEDULE_RUNNER_BATCH_SIZE,
  SCHEDULE_CLAIM_SENTINEL,
  STALE_SCHEDULE_GRACE_MS,
} from "../src/schedule-runner.js";

const mockScheduleFindMany = vi.fn();
const mockScheduleUpdateMany = vi.fn();
const mockScheduleUpdate = vi.fn();
const mockActorFindUnique = vi.fn();
const mockActorRunCreate = vi.fn();

vi.mock("../src/config.js", () => ({
  getPrisma: vi.fn(() => ({
    schedule: {
      findMany: mockScheduleFindMany,
      updateMany: mockScheduleUpdateMany,
      update: mockScheduleUpdate,
    },
    actor: {
      findUnique: mockActorFindUnique,
    },
    actorRun: {
      create: mockActorRunCreate,
    },
  })),
}));

vi.mock("../src/webhook-trigger.js", () => ({
  triggerWebhooks: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function dueSchedule(overrides: Record<string, unknown> = {}) {
  return {
    id: "sched-1",
    workspaceId: "ws-1",
    actorId: "actor-1",
    actorVersionId: null,
    cronExpression: "0 * * * *",
    inputOverride: null,
    enabled: true,
    nextRunAt: new Date(Date.now() - 1000),
    lastRunAt: new Date(Date.now() - 3600000),
    errorMessage: null,
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 3600000),
    ...overrides,
  };
}

describe("computeNextRun", () => {
  it("returns next hour for hourly cron", () => {
    const result = computeNextRun("0 * * * *", new Date("2026-07-23T10:15:00Z"));
    expect(result).toBeInstanceOf(Date);
    expect(result!.toISOString()).toBe("2026-07-23T11:00:00.000Z");
  });

  it("returns next minute for every-minute cron", () => {
    const result = computeNextRun("* * * * *", new Date("2026-07-23T10:15:30Z"));
    expect(result).toBeInstanceOf(Date);
    expect(result!.toISOString()).toBe("2026-07-23T10:16:00.000Z");
  });

  it("returns next daily at specific time", () => {
    const result = computeNextRun("30 8 * * *", new Date("2026-07-23T10:00:00Z"));
    expect(result!.getUTCHours()).toBe(8);
    expect(result!.getUTCMinutes()).toBe(30);
    expect(result!.getUTCDate()).toBe(24);
  });

  it("returns null for invalid cron expression", () => {
    const result = computeNextRun("invalid cron", new Date());
    expect(result).toBeNull();
  });

  it("returns null for impossible cron (Feb 30)", () => {
    const result = computeNextRun("0 0 30 2 *", new Date("2026-07-23T00:00:00Z"));
    expect(result).toBeNull();
  });
});

describe("processDueSchedules", () => {
  it("selects due schedules and creates runs", async () => {
    mockScheduleFindMany.mockResolvedValue([dueSchedule()]);
    mockScheduleUpdateMany.mockResolvedValue({ count: 1 });
    mockActorFindUnique.mockResolvedValue({ workspaceId: "ws-1" });
    mockActorRunCreate.mockResolvedValue({ id: "run-1", status: "PENDING" });

    const result = await processDueSchedules();

    expect(result.processed).toBe(1);
    expect(result.runsCreated).toBe(1);
    expect(result.errors).toBe(0);
    expect(mockScheduleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { enabled: true, nextRunAt: { lte: expect.any(Date) } },
        take: SCHEDULE_RUNNER_BATCH_SIZE,
      }),
    );
  });

  it("skips non-due schedules", async () => {
    mockScheduleFindMany.mockResolvedValue([]);

    const result = await processDueSchedules();

    expect(result.processed).toBe(0);
    expect(result.runsCreated).toBe(0);
    expect(result.errors).toBe(0);
    expect(mockScheduleUpdateMany).not.toHaveBeenCalled();
    expect(mockActorRunCreate).not.toHaveBeenCalled();
  });

  it("prevents double-dispatch via claim", async () => {
    mockScheduleFindMany.mockResolvedValue([dueSchedule()]);
    mockScheduleUpdateMany.mockResolvedValue({ count: 0 });

    const result = await processDueSchedules();

    expect(result.processed).toBe(0);
    expect(result.runsCreated).toBe(0);
    expect(mockActorRunCreate).not.toHaveBeenCalled();
    expect(mockScheduleUpdateMany).toHaveBeenCalledWith({
      where: { id: "sched-1", nextRunAt: expect.any(Date) },
      data: { nextRunAt: SCHEDULE_CLAIM_SENTINEL },
    });
  });

  it("advances nextRunAt for recurring schedule", async () => {
    mockScheduleFindMany.mockResolvedValue([dueSchedule()]);
    mockScheduleUpdateMany.mockResolvedValue({ count: 1 });
    mockActorFindUnique.mockResolvedValue({ workspaceId: "ws-1" });
    mockActorRunCreate.mockResolvedValue({ id: "run-2", status: "PENDING" });

    const result = await processDueSchedules();

    expect(result.processed).toBe(1);
    expect(result.runsCreated).toBe(1);
    const lastCall = mockScheduleUpdate.mock.lastCall;
    expect(lastCall).toBeDefined();
    expect(lastCall![0].data.nextRunAt).toBeInstanceOf(Date);
    expect(lastCall![0].data.nextRunAt!.getTime()).toBeGreaterThan(Date.now());
    expect(lastCall![0].data.lastRunAt).toBeInstanceOf(Date);
  });

  it("disables one-off schedule when no future run exists", async () => {
    mockScheduleFindMany.mockResolvedValue([
      dueSchedule({
        cronExpression: "0 0 30 2 *",
        nextRunAt: new Date("2026-02-28T00:00:00Z"),
      }),
    ]);
    mockScheduleUpdateMany.mockResolvedValue({ count: 1 });
    mockActorFindUnique.mockResolvedValue({ workspaceId: "ws-1" });
    mockActorRunCreate.mockResolvedValue({ id: "run-3", status: "PENDING" });

    const result = await processDueSchedules();

    expect(result.processed).toBe(1);
    expect(result.runsCreated).toBe(1);
    const lastCall = mockScheduleUpdate.mock.lastCall;
    expect(lastCall).toBeDefined();
    expect(lastCall![0].data.enabled).toBe(false);
    expect(lastCall![0].data.nextRunAt).toBeNull();
  });

  it("handles missing actor gracefully", async () => {
    mockScheduleFindMany.mockResolvedValue([dueSchedule()]);
    mockScheduleUpdateMany.mockResolvedValue({ count: 1 });
    mockActorFindUnique.mockResolvedValue(null);

    const result = await processDueSchedules();

    expect(result.processed).toBe(1);
    expect(result.errors).toBe(1);
    expect(result.runsCreated).toBe(0);
    expect(mockActorRunCreate).not.toHaveBeenCalled();
    expect(mockScheduleUpdate).toHaveBeenCalledWith({
      where: { id: "sched-1" },
      data: expect.objectContaining({ enabled: false, errorMessage: "Actor not found or workspace mismatch" }),
    });
  });

  it("processes multiple due schedules in batch", async () => {
    const schedules = [
      dueSchedule({ id: "sched-1" }),
      dueSchedule({ id: "sched-2", actorId: "actor-2" }),
    ];
    mockScheduleFindMany.mockResolvedValue(schedules);
    mockScheduleUpdateMany.mockResolvedValue({ count: 1 });
    mockActorFindUnique
      .mockResolvedValueOnce({ workspaceId: "ws-1" })
      .mockResolvedValueOnce({ workspaceId: "ws-1" });
    mockActorRunCreate
      .mockResolvedValueOnce({ id: "run-1", status: "PENDING" })
      .mockResolvedValueOnce({ id: "run-2", status: "PENDING" });

    const result = await processDueSchedules();

    expect(result.processed).toBe(2);
    expect(result.runsCreated).toBe(2);
    expect(mockScheduleUpdateMany).toHaveBeenCalledTimes(2);
    expect(mockActorFindUnique).toHaveBeenCalledTimes(2);
    expect(mockActorRunCreate).toHaveBeenCalledTimes(2);
  });

  it("respects custom batch size", async () => {
    mockScheduleFindMany.mockResolvedValue([]);

    await processDueSchedules({ batchSize: 5 });

    expect(mockScheduleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
    );
  });
});

describe("recoverStaleSchedules", () => {
  it("recovers recurring schedule stuck at sentinel", async () => {
    const now = Date.now();
    mockScheduleFindMany.mockResolvedValue([
      {
        id: "sched-stale-1",
        workspaceId: "ws-1",
        actorId: "actor-1",
        cronExpression: "0 * * * *",
        enabled: true,
        nextRunAt: SCHEDULE_CLAIM_SENTINEL,
        updatedAt: new Date(now - STALE_SCHEDULE_GRACE_MS - 1000),
      },
    ]);
    mockScheduleUpdateMany.mockResolvedValue({ count: 1 });

    const recovered = await recoverStaleSchedules({ graceMs: STALE_SCHEDULE_GRACE_MS });

    expect(recovered).toBe(1);
    expect(mockScheduleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          enabled: true,
          nextRunAt: SCHEDULE_CLAIM_SENTINEL,
          updatedAt: { lte: expect.any(Date) },
        },
      }),
    );
    expect(mockScheduleUpdateMany).toHaveBeenCalledWith({
      where: { id: "sched-stale-1", nextRunAt: SCHEDULE_CLAIM_SENTINEL },
      data: { nextRunAt: expect.any(Date) },
    });
  });

  it("recovers one-off schedule stuck at sentinel", async () => {
    const now = Date.now();
    mockScheduleFindMany.mockResolvedValue([
      {
        id: "sched-stale-2",
        workspaceId: "ws-1",
        actorId: "actor-1",
        cronExpression: "0 0 30 2 *",
        enabled: true,
        nextRunAt: SCHEDULE_CLAIM_SENTINEL,
        updatedAt: new Date(now - STALE_SCHEDULE_GRACE_MS - 1000),
      },
    ]);
    mockScheduleUpdateMany.mockResolvedValue({ count: 1 });

    const recovered = await recoverStaleSchedules({ graceMs: STALE_SCHEDULE_GRACE_MS });

    expect(recovered).toBe(1);
    expect(mockScheduleUpdateMany).toHaveBeenCalledWith({
      where: { id: "sched-stale-2", nextRunAt: SCHEDULE_CLAIM_SENTINEL },
      data: { nextRunAt: expect.any(Date) },
    });
  });

  it("does not recover non-stale claimed schedule (recently updated)", async () => {
    mockScheduleFindMany.mockResolvedValue([]);

    const recovered = await recoverStaleSchedules({ graceMs: STALE_SCHEDULE_GRACE_MS });

    expect(recovered).toBe(0);
    expect(mockScheduleUpdateMany).not.toHaveBeenCalled();
  });

  it("skips already-recovered schedule (claim race)", async () => {
    const now = Date.now();
    mockScheduleFindMany.mockResolvedValue([
      {
        id: "sched-stale-3",
        workspaceId: "ws-1",
        actorId: "actor-1",
        cronExpression: "0 * * * *",
        enabled: true,
        nextRunAt: SCHEDULE_CLAIM_SENTINEL,
        updatedAt: new Date(now - STALE_SCHEDULE_GRACE_MS - 1000),
      },
    ]);
    mockScheduleUpdateMany.mockResolvedValue({ count: 0 });

    const recovered = await recoverStaleSchedules({ graceMs: STALE_SCHEDULE_GRACE_MS });

    expect(recovered).toBe(0);
  });

  it("respects custom grace period", async () => {
    const shortGrace = 1000;
    const now = Date.now();
    mockScheduleFindMany.mockResolvedValue([
      {
        id: "sched-stale-4",
        workspaceId: "ws-1",
        actorId: "actor-1",
        cronExpression: "0 * * * *",
        enabled: true,
        nextRunAt: SCHEDULE_CLAIM_SENTINEL,
        updatedAt: new Date(now - shortGrace - 100),
      },
    ]);
    mockScheduleUpdateMany.mockResolvedValue({ count: 1 });

    const recovered = await recoverStaleSchedules({ graceMs: shortGrace });

    expect(recovered).toBe(1);
  });
});
