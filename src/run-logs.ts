import type { Prisma, PrismaClient } from "@prisma/client";
import { getPrisma } from "./config.js";

export interface LogEntryData {
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  message: string;
  metadata?: Prisma.InputJsonValue;
}

export async function createLogEntry(
  prisma: PrismaClient,
  runId: string,
  data: LogEntryData,
): Promise<void> {
  await prisma.logEntry.create({
    data: {
      runId,
      level: data.level,
      message: data.message,
      ...(data.metadata ? { metadata: data.metadata } : {}),
    },
  });
}

export async function getRunLogs(
  runId: string,
  options?: { limit?: number; cursor?: string },
): Promise<{ logs: { id: string; level: string; message: string; metadata: unknown; timestamp: Date }[]; nextCursor?: string }> {
  const prisma = getPrisma();
  const limit = options?.limit ?? 100;
  const cursor = options?.cursor;

  const items = await prisma.logEntry.findMany({
    where: { runId },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { timestamp: "asc" },
  });

  const hasMore = items.length > limit;
  const logs = hasMore ? items.slice(0, limit) : items;
  let nextCursor: string | undefined;
  if (hasMore) {
    const last = logs.at(-1);
    if (last) nextCursor = last.id;
  }

  return { logs, ...(nextCursor ? { nextCursor } : {}) };
}
