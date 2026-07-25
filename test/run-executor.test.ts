import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { claimAndExecuteRun, cancelRun, EXECUTOR_BATCH_SIZE, EXECUTOR_TIMEOUT_MS } from "../src/run-executor.js";

const mockUpdateMany = vi.fn();
const mockFindUniqueOrThrow = vi.fn();
const mockFindUnique = vi.fn();
const mockDatasetCreate = vi.fn();
const mockDatasetItemCreate = vi.fn();
const mockActorRunUpdate = vi.fn();
const mockLogEntryCreate = vi.fn();

const mockFork = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  fork: mockFork,
}));

vi.mock("../src/config.js", () => ({
  getPrisma: vi.fn(() => ({
    actorRun: {
      updateMany: mockUpdateMany,
      findUniqueOrThrow: mockFindUniqueOrThrow,
      findUnique: mockFindUnique,
      update: mockActorRunUpdate,
    },
    dataset: { create: mockDatasetCreate },
    datasetItem: { create: mockDatasetItemCreate },
    logEntry: { create: mockLogEntryCreate },
  })),
}));

vi.mock("../src/run-logs.js", () => ({
  createLogEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock("../src/webhook-trigger.js", () => ({
  triggerWebhooks: vi.fn(),
}));

function makeChildProcess() {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  return {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handler;
    }),
    send: vi.fn((_msg: unknown) => {
      process.nextTick(() => {
        const h = handlers.message;
        if (h) {
          h({
            succeeded: true,
            errorMessage: null,
            outputItems: [{ result: "ok", processed: true }],
            logs: [{ level: "INFO", message: "Worker executed" }],
            runId: "run-1",
          });
        }
      });
    }),
    kill: vi.fn(),
    emit: (event: string, ...args: unknown[]) => {
      const h = handlers[event];
      if (h) h(...args);
    },
  };
}

function makeDelayedChild(delayMs: number): ReturnType<typeof makeChildProcess> {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  return {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handler;
    }),
    send: vi.fn((_msg: unknown) => {
      setTimeout(() => {
        const h = handlers.message;
        if (h) {
          h({
            succeeded: true,
            errorMessage: null,
            outputItems: [],
            logs: [],
            runId: "run-1",
          });
        }
      }, delayMs);
    }),
    kill: vi.fn(),
    emit: (event: string, ...args: unknown[]) => {
      const h = handlers[event];
      if (h) h(...args);
    },
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/* eslint-disable @typescript-eslint/dot-notation */
describe("claimAndExecuteRun", () => {
  it("claims a PENDING run and executes via isolated worker", async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindUniqueOrThrow.mockResolvedValue({
      id: "run-1",
      actorId: "actor-1",
      workspaceId: "ws-1",
      input: null,
    });
    mockDatasetCreate.mockResolvedValue({ id: "ds-1", workspaceId: "ws-1" });
    mockDatasetItemCreate.mockResolvedValue({ id: "item-1", sequence: 0 });

    const child = makeChildProcess();
    mockFork.mockReturnValue(child);

    const resultPromise = claimAndExecuteRun("run-1");
    await vi.advanceTimersByTimeAsync(0);
    const result = await resultPromise;

    expect(result.succeeded).toBe(true);
    expect(result.errorMessage).toBeNull();
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: "run-1", status: "PENDING" },
      data: { status: "RUNNING", startedAt: expect.any(Date) },
    });
    expect(mockFork).toHaveBeenCalledOnce();
    expect(child.send).toHaveBeenCalledWith(
      expect.objectContaining({ runId: "run-1" }),
    );
    expect(mockDatasetCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ workspaceId: "ws-1", actorRunId: "run-1" }),
      }),
    );
    expect(mockDatasetItemCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ datasetId: "ds-1", sequence: 0 }),
      }),
    );
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-1", status: "RUNNING" },
        data: expect.objectContaining({ status: "SUCCEEDED" }),
      }),
    );
  });

  it("returns error when run cannot be claimed", async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 });

    const result = await claimAndExecuteRun("run-claimed");

    expect(result.succeeded).toBe(false);
    expect(result.errorMessage).toBe("Run not found or already claimed");
    expect(mockFindUniqueOrThrow).not.toHaveBeenCalled();
    expect(mockFork).not.toHaveBeenCalled();
  });

  it("marks run FAILED when worker reports failure", async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindUniqueOrThrow.mockResolvedValue({
      id: "run-2",
      actorId: "actor-1",
      workspaceId: "ws-1",
      input: null,
    });

    const handlers: Record<string, (...args: unknown[]) => void> = {};
    const child = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        handlers[event] = handler;
      }),
      send: vi.fn((_msg: unknown) => {
        process.nextTick(() => {
          const h = handlers["message"];
          if (h) {
            h({
              succeeded: false,
              errorMessage: "Actor code crashed",
              outputItems: [],
              logs: [{ level: "ERROR", message: "Actor code crashed" }],
              runId: "run-2",
            });
          }
        });
      }),
      kill: vi.fn(),
      emit: (_event: string, ..._args: unknown[]) => undefined,
    };
    mockFork.mockReturnValue(child);

    const resultPromise = claimAndExecuteRun("run-2");
    await vi.advanceTimersByTimeAsync(0);
    const result = await resultPromise;

    expect(result.succeeded).toBe(false);
    expect(result.errorMessage).toBe("Actor code crashed");
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-2", status: { in: ["RUNNING", "PENDING"] } },
        data: expect.objectContaining({ status: "FAILED", errorMessage: "Actor code crashed" }),
      }),
    );
  });

  it("marks run FAILED on worker timeout", async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindUniqueOrThrow.mockResolvedValue({
      id: "run-3",
      actorId: "actor-1",
      workspaceId: "ws-1",
      input: null,
    });

    const child = makeDelayedChild(999_999);
    mockFork.mockReturnValue(child);

    const resultPromise = claimAndExecuteRun("run-3", { timeoutMs: 5000 });
    await vi.advanceTimersByTimeAsync(5000);
    const result = await resultPromise;

    expect(result.succeeded).toBe(false);
    expect(result.errorMessage).toBe("Execution timed out after 5000ms");
    expect(child.kill).toHaveBeenCalled();
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-3", status: { in: ["RUNNING", "PENDING"] } },
        data: expect.objectContaining({ status: "FAILED", errorMessage: "Execution timed out after 5000ms" }),
      }),
    );
  });

  it("marks run FAILED on worker crash (non-zero exit)", async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindUniqueOrThrow.mockResolvedValue({
      id: "run-4",
      actorId: "actor-1",
      workspaceId: "ws-1",
      input: null,
    });

    const handlers: Record<string, (...args: unknown[]) => void> = {};
    const child = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        handlers[event] = handler;
      }),
      send: vi.fn((_msg: unknown) => {
        process.nextTick(() => {
          const h = handlers["exit"];
          if (h) h(1);
        });
      }),
      kill: vi.fn(),
      emit: (_event: string, ..._args: unknown[]) => undefined,
    };
    mockFork.mockReturnValue(child);

    const resultPromise = claimAndExecuteRun("run-4");
    await vi.advanceTimersByTimeAsync(0);
    const result = await resultPromise;

    expect(result.succeeded).toBe(false);
    expect(result.errorMessage).toBe("Worker process exited with code 1");
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-4", status: { in: ["RUNNING", "PENDING"] } },
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
  });

  it("marks run FAILED on worker process error", async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindUniqueOrThrow.mockResolvedValue({
      id: "run-5",
      actorId: "actor-1",
      workspaceId: "ws-1",
      input: null,
    });

    const handlers: Record<string, (...args: unknown[]) => void> = {};
    const child = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        handlers[event] = handler;
      }),
      send: vi.fn((_msg: unknown) => {
        process.nextTick(() => {
          const h = handlers["error"];
          if (h) h(new Error("ENOENT: tsx not found"));
        });
      }),
      kill: vi.fn(),
      emit: (_event: string, ..._args: unknown[]) => undefined,
    };
    mockFork.mockReturnValue(child);

    const resultPromise = claimAndExecuteRun("run-5");
    await vi.advanceTimersByTimeAsync(0);
    const result = await resultPromise;

    expect(result.succeeded).toBe(false);
    expect(result.errorMessage).toBe("ENOENT: tsx not found");
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-5", status: { in: ["RUNNING", "PENDING"] } },
        data: expect.objectContaining({ status: "FAILED", errorMessage: "ENOENT: tsx not found" }),
      }),
    );
  });

  it("produces items from input.items array", async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindUniqueOrThrow.mockResolvedValue({
      id: "run-6",
      actorId: "actor-1",
      workspaceId: "ws-1",
      input: { items: [{ page: 1 }, { page: 2 }, { page: 3 }] },
    });
    mockDatasetCreate.mockResolvedValue({ id: "ds-2" });
    mockDatasetItemCreate.mockResolvedValue({});

    const handlers: Record<string, (...args: unknown[]) => void> = {};
    const child = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        handlers[event] = handler;
      }),
      send: vi.fn((msg: unknown) => {
        process.nextTick(() => {
          const h = handlers["message"];
          if (h) {
            h({
              succeeded: true,
              errorMessage: null,
              outputItems: (msg as { input: { items: unknown[] } }).input.items,
              logs: [],
              runId: "run-6",
            });
          }
        });
      }),
      kill: vi.fn(),
      emit: (_event: string, ..._args: unknown[]) => undefined,
    };
    mockFork.mockReturnValue(child);

    const resultPromise = claimAndExecuteRun("run-6");
    await vi.advanceTimersByTimeAsync(0);
    const result = await resultPromise;

    expect(result.succeeded).toBe(true);
    expect(mockDatasetItemCreate).toHaveBeenCalledTimes(3);
    expect(mockDatasetItemCreate).toHaveBeenNthCalledWith(1,
      expect.objectContaining({
        data: expect.objectContaining({ datasetId: "ds-2", sequence: 0 }),
      }),
    );
    expect(mockDatasetItemCreate).toHaveBeenNthCalledWith(2,
      expect.objectContaining({
        data: expect.objectContaining({ datasetId: "ds-2", sequence: 1 }),
      }),
    );
    expect(mockDatasetItemCreate).toHaveBeenNthCalledWith(3,
      expect.objectContaining({
        data: expect.objectContaining({ datasetId: "ds-2", sequence: 2 }),
      }),
    );
  });

  it("handles failure without crashing when finalize also fails", async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindUniqueOrThrow.mockResolvedValue({
      id: "run-7",
      actorId: "actor-1",
      workspaceId: "ws-1",
      input: null,
    });

    const handlers: Record<string, (...args: unknown[]) => void> = {};
    const child = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        handlers[event] = handler;
      }),
      send: vi.fn((_msg: unknown) => {
        process.nextTick(() => {
          const h = handlers["exit"];
          if (h) h(1);
        });
      }),
      kill: vi.fn(),
      emit: (_event: string, ..._args: unknown[]) => undefined,
    };
    mockFork.mockReturnValue(child);
    mockUpdateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockRejectedValueOnce(new Error("finalize also failed"));

    const resultPromise = claimAndExecuteRun("run-7");
    await vi.advanceTimersByTimeAsync(0);
    const result = await resultPromise;

    expect(result.succeeded).toBe(false);
    expect(result.errorMessage).toBe("Worker process exited with code 1");
  });

  it("exports EXECUTOR_BATCH_SIZE", () => {
    expect(EXECUTOR_BATCH_SIZE).toBe(5);
  });

  it("exports EXECUTOR_TIMEOUT_MS", () => {
    expect(EXECUTOR_TIMEOUT_MS).toBe(300_000);
  });

  it("cancelRun kills running child and returns true", async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindUniqueOrThrow.mockResolvedValue({
      id: "run-8",
      actorId: "actor-1",
      workspaceId: "ws-1",
      input: { items: [] },
    });

    const handlers: Record<string, (...args: unknown[]) => void> = {};
    const child = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        handlers[event] = handler;
      }),
      send: vi.fn(),
      kill: vi.fn(() => {
        process.nextTick(() => {
          const h = handlers["exit"];
          if (h) h(1);
        });
      }),
      emit: (_event: string, ..._args: unknown[]) => undefined,
    };
    mockFork.mockReturnValue(child);

    const resultPromise = claimAndExecuteRun("run-8", { timeoutMs: 300_000 });
    await vi.advanceTimersByTimeAsync(0);

    const killed = cancelRun("run-8");
    expect(killed).toBe(true);
    expect(child.kill).toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(0);
    const result = await resultPromise;

    expect(result.succeeded).toBe(false);
    expect(result.errorMessage).toBe("Worker process exited with code 1");
  });

  it("cancelRun returns false for unknown run", () => {
    expect(cancelRun("nonexistent-run")).toBe(false);
  });

  it("does not create dataset or fire webhook when finalize is no-op (race with cancel)", async () => {
    mockUpdateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    mockFindUniqueOrThrow.mockResolvedValue({
      id: "run-race",
      actorId: "actor-1",
      workspaceId: "ws-1",
      input: { items: [] },
    });

    const handlers: Record<string, (...args: unknown[]) => void> = {};
    const child = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        handlers[event] = handler;
      }),
      send: vi.fn((_msg: unknown) => {
        process.nextTick(() => {
          const h = handlers.message;
          if (h) {
            h({
              succeeded: true,
              errorMessage: null,
              outputItems: [{ id: 1 }],
              logs: [{ level: "INFO", message: "Done" }],
              runId: "run-race",
            });
          }
        });
      }),
      kill: vi.fn(),
      emit: (_event: string, ..._args: unknown[]) => undefined,
    };
    mockFork.mockReturnValue(child);

    const resultPromise = claimAndExecuteRun("run-race");
    await vi.advanceTimersByTimeAsync(0);
    const result = await resultPromise;

    expect(result.succeeded).toBe(false);
    expect(result.errorMessage).toBe("Run no longer in RUNNING state");
    expect(mockDatasetCreate).not.toHaveBeenCalled();
    expect(mockDatasetItemCreate).not.toHaveBeenCalled();
  });

  it("finalize does not overwrite CANCELED status", async () => {
    mockUpdateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    mockFindUniqueOrThrow.mockResolvedValue({
      id: "run-9",
      actorId: "actor-1",
      workspaceId: "ws-1",
      input: null,
    });

    const child = makeChildProcess();
    mockFork.mockReturnValue(child);

    const resultPromise = claimAndExecuteRun("run-9");
    await vi.advanceTimersByTimeAsync(0);
    const result = await resultPromise;

    expect(result.succeeded).toBe(false);
    expect(result.errorMessage).toBe("Run no longer in RUNNING state");
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-9", status: "RUNNING" },
        data: expect.objectContaining({ status: "SUCCEEDED" }),
      }),
    );
    expect(mockDatasetCreate).not.toHaveBeenCalled();
  });
});
/* eslint-enable @typescript-eslint/dot-notation */
