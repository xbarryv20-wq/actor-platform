import type { PrismaClient } from "@prisma/client";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLogEntry, getRunLogs } from "../src/run-logs.js";

const mockLogEntryCreate = vi.fn();
const mockLogEntryFindMany = vi.fn();

const mockPrisma = {
  logEntry: {
    create: mockLogEntryCreate,
    findMany: mockLogEntryFindMany,
  },
} as unknown as PrismaClient;

vi.mock("../src/config.js", () => ({
  getPrisma: vi.fn(() => mockPrisma),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createLogEntry", () => {
  it("creates an INFO log entry", async () => {
    mockLogEntryCreate.mockResolvedValue({ id: "log-1" });

    await createLogEntry(mockPrisma, "run-1", {
      level: "INFO",
      message: "Test message",
    });

    expect(mockLogEntryCreate).toHaveBeenCalledWith({
      data: { runId: "run-1", level: "INFO", message: "Test message" },
    });
  });

  it("creates an ERROR log entry with metadata", async () => {
    mockLogEntryCreate.mockResolvedValue({ id: "log-2" });

    await createLogEntry(mockPrisma, "run-1", {
      level: "ERROR",
      message: "Something broke",
      metadata: { error: "details" },
    });

    expect(mockLogEntryCreate).toHaveBeenCalledWith({
      data: {
        runId: "run-1",
        level: "ERROR",
        message: "Something broke",
        metadata: { error: "details" },
      },
    });
  });
});

describe("getRunLogs", () => {
  it("returns logs for a run", async () => {
    mockLogEntryFindMany.mockResolvedValue([
      { id: "log-1", level: "INFO", message: "start", metadata: null, timestamp: new Date("2026-01-01") },
      { id: "log-2", level: "ERROR", message: "fail", metadata: null, timestamp: new Date("2026-01-02") },
    ]);

    const result = await getRunLogs("run-1");

    expect(result.logs).toHaveLength(2);
    expect(result.logs[0]!.message).toBe("start");
    expect(result.logs[1]!.level).toBe("ERROR");
    expect(result.nextCursor).toBeUndefined();
  });

  it("returns empty array when no logs exist", async () => {
    mockLogEntryFindMany.mockResolvedValue([]);

    const result = await getRunLogs("run-empty");

    expect(result.logs).toHaveLength(0);
    expect(result.nextCursor).toBeUndefined();
  });

  it("supports cursor pagination", async () => {
    const logs = Array.from({ length: 101 }, (_, i) => ({
      id: `log-${String(i)}`,
      level: "INFO",
      message: `line ${String(i)}`,
      metadata: null,
      timestamp: new Date(`2026-01-${String(i + 1).padStart(2, "0")}`),
    }));
    mockLogEntryFindMany.mockResolvedValue(logs);

    const result = await getRunLogs("run-paginated", { limit: 100 });

    expect(result.logs).toHaveLength(100);
    expect(result.nextCursor).toBe("log-99");
  });
});
