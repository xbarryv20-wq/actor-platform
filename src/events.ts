import type { PrismaClient, EventType, Prisma } from "@prisma/client";
import { getPrisma } from "./config.js";

export type EventPayload = Record<string, unknown>;

export interface EmitEventInput {
  workspaceId: string;
  actorId?: string;
  actorVersionId?: string;
  runId?: string;
  scheduleId?: string;
  type: EventType;
  message: string;
  payload?: EventPayload;
}

export async function emitEvent(
  prisma: PrismaClient,
  input: EmitEventInput,
): Promise<void> {
  await prisma.platformEvent.create({
    data: {
      workspaceId: input.workspaceId,
      actorId: input.actorId ?? null,
      actorVersionId: input.actorVersionId ?? null,
      runId: input.runId ?? null,
      scheduleId: input.scheduleId ?? null,
      type: input.type,
      message: input.message,
      payload: (input.payload ?? null) as Prisma.InputJsonValue | undefined,
    },
  });
}

export interface ListEventsOptions {
  limit?: number;
  cursor?: string;
  types?: string[];
  prisma?: PrismaClient;
}

export interface ListEventsResult {
  events: {
    id: string;
    workspaceId: string;
    actorId: string | null;
    actorVersionId: string | null;
    runId: string | null;
    scheduleId: string | null;
    type: string;
    message: string | null;
    payload: unknown;
    createdAt: Date;
  }[];
  nextCursor?: string;
}

export async function listWorkspaceEvents(
  workspaceId: string,
  options?: ListEventsOptions,
): Promise<ListEventsResult> {
  const prisma = options?.prisma ?? getPrisma();
  const limit = options?.limit ?? 50;
  const cursor = options?.cursor;
  const types = options?.types;

  const where: Prisma.PlatformEventWhereInput = { workspaceId };
  if (types && types.length > 0) {
    where.type = { in: types as EventType[] };
  }

  const items = await prisma.platformEvent.findMany({
    where,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  const hasMore = items.length > limit;
  const events = hasMore ? items.slice(0, limit) : items;
  let nextCursor: string | undefined;
  if (hasMore) {
    const last = events.at(-1);
    if (last) nextCursor = last.id;
  }

  return { events, ...(nextCursor ? { nextCursor } : {}) };
}
