import { describe, it, expect, vi } from "vitest";
import { emitEvent, listWorkspaceEvents } from "../src/events.js";

const mockPrisma = {
  platformEvent: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
};

describe("emitEvent", () => {
  it("creates a RUN_SUCCEEDED event", async () => {
    mockPrisma.platformEvent.create.mockResolvedValue({ id: "evt-1" });

    await emitEvent(mockPrisma as never, {
      workspaceId: "ws-1",
      actorId: "actor-1",
      runId: "run-1",
      type: "RUN_SUCCEEDED",
      message: "Run run-1 succeeded",
    });

    expect(mockPrisma.platformEvent.create).toHaveBeenCalledWith({
      data: {
        workspaceId: "ws-1",
        actorId: "actor-1",
        actorVersionId: null,
        runId: "run-1",
        scheduleId: null,
        type: "RUN_SUCCEEDED",
        message: "Run run-1 succeeded",
        payload: null,
      },
    });
  });

  it("creates a RUN_FAILED event with payload", async () => {
    mockPrisma.platformEvent.create.mockResolvedValue({ id: "evt-2" });

    await emitEvent(mockPrisma as never, {
      workspaceId: "ws-1",
      actorId: "actor-1",
      runId: "run-1",
      type: "RUN_FAILED",
      message: "Run run-1 failed",
      payload: { errorMessage: "Timeout" },
    });

    expect(mockPrisma.platformEvent.create).toHaveBeenCalledWith({
      data: {
        workspaceId: "ws-1",
        actorId: "actor-1",
        actorVersionId: null,
        runId: "run-1",
        scheduleId: null,
        type: "RUN_FAILED",
        message: "Run run-1 failed",
        payload: { errorMessage: "Timeout" },
      },
    });
  });

  it("creates a RUN_CANCELED event", async () => {
    mockPrisma.platformEvent.create.mockResolvedValue({ id: "evt-3" });

    await emitEvent(mockPrisma as never, {
      workspaceId: "ws-1",
      actorId: "actor-1",
      runId: "run-1",
      type: "RUN_CANCELED",
      message: "Run run-1 canceled",
    });

    expect(mockPrisma.platformEvent.create).toHaveBeenCalledWith({
      data: {
        workspaceId: "ws-1",
        actorId: "actor-1",
        actorVersionId: null,
        runId: "run-1",
        scheduleId: null,
        type: "RUN_CANCELED",
        message: "Run run-1 canceled",
        payload: null,
      },
    });
  });

  it("creates an ACTOR_PUBLISHED event", async () => {
    mockPrisma.platformEvent.create.mockResolvedValue({ id: "evt-4" });

    await emitEvent(mockPrisma as never, {
      workspaceId: "ws-1",
      actorId: "actor-1",
      type: "ACTOR_PUBLISHED",
      message: "Actor MyActor published",
      payload: { name: "MyActor", slug: "my-actor" },
    });

    expect(mockPrisma.platformEvent.create).toHaveBeenCalledWith({
      data: {
        workspaceId: "ws-1",
        actorId: "actor-1",
        actorVersionId: null,
        runId: null,
        scheduleId: null,
        type: "ACTOR_PUBLISHED",
        message: "Actor MyActor published",
        payload: { name: "MyActor", slug: "my-actor" },
      },
    });
  });

  it("creates a SCHEDULE_DISPATCHED event with all optional fields", async () => {
    mockPrisma.platformEvent.create.mockResolvedValue({ id: "evt-5" });

    await emitEvent(mockPrisma as never, {
      workspaceId: "ws-1",
      actorId: "actor-1",
      actorVersionId: "v-1",
      runId: "run-1",
      scheduleId: "sched-1",
      type: "SCHEDULE_DISPATCHED",
      message: "Schedule sched-1 dispatched run",
      payload: { cronExpression: "0 * * * *" },
    });

    expect(mockPrisma.platformEvent.create).toHaveBeenCalledWith({
      data: {
        workspaceId: "ws-1",
        actorId: "actor-1",
        actorVersionId: "v-1",
        runId: "run-1",
        scheduleId: "sched-1",
        type: "SCHEDULE_DISPATCHED",
        message: "Schedule sched-1 dispatched run",
        payload: { cronExpression: "0 * * * *" },
      },
    });
  });
});

describe("listWorkspaceEvents", () => {
  it("returns events ordered by createdAt desc", async () => {
    mockPrisma.platformEvent.findMany.mockResolvedValue([
      { id: "e1", workspaceId: "ws-1", type: "RUN_SUCCEEDED", createdAt: new Date("2026-07-23T10:00:00Z"), message: "Run abc succeeded", payload: null, actorId: "a1", actorVersionId: null, runId: "r1", scheduleId: null },
      { id: "e2", workspaceId: "ws-1", type: "RUN_FAILED", createdAt: new Date("2026-07-23T09:00:00Z"), message: "Run def failed", payload: null, actorId: "a1", actorVersionId: null, runId: "r2", scheduleId: null },
    ]);

    const result = await listWorkspaceEvents("ws-1", { limit: 10, prisma: mockPrisma as never });

    expect(mockPrisma.platformEvent.findMany).toHaveBeenCalledWith({
      where: { workspaceId: "ws-1" },
      take: 11,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    expect(result.events).toHaveLength(2);
    expect(result.events[0]!.id).toBe("e1");
    expect(result.events[1]!.id).toBe("e2");
  });

  it("filters by event types", async () => {
    mockPrisma.platformEvent.findMany.mockResolvedValue([]);

    await listWorkspaceEvents("ws-1", { types: ["RUN_SUCCEEDED", "RUN_FAILED"], prisma: mockPrisma as never });

    expect(mockPrisma.platformEvent.findMany).toHaveBeenCalledWith({
      where: { workspaceId: "ws-1", type: { in: ["RUN_SUCCEEDED", "RUN_FAILED"] } },
      take: 51,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  });

  it("returns empty list for workspace with no events", async () => {
    mockPrisma.platformEvent.findMany.mockResolvedValue([]);

    const result = await listWorkspaceEvents("ws-empty", { prisma: mockPrisma as never });

    expect(result.events).toHaveLength(0);
    expect(result.nextCursor).toBeUndefined();
  });

  it("returns paginated results with cursor", async () => {
    const items = Array.from({ length: 15 }, (_, i) => ({
      id: `e${i}`,
      workspaceId: "ws-1",
      type: "RUN_SUCCEEDED" as const,
      createdAt: new Date(`2026-07-23T${String(i).padStart(2, "0")}:00:00Z`),
      message: `Run ${i}`,
      payload: null,
      actorId: "a1",
      actorVersionId: null,
      runId: `r${i}`,
      scheduleId: null,
    }));

    mockPrisma.platformEvent.findMany.mockResolvedValue(items);

    const result = await listWorkspaceEvents("ws-1", { limit: 10, prisma: mockPrisma as never });

    expect(mockPrisma.platformEvent.findMany).toHaveBeenCalledWith({
      where: { workspaceId: "ws-1" },
      take: 11,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    expect(result.events).toHaveLength(10);
    expect(result.nextCursor).toBe("e9");
  });
});
