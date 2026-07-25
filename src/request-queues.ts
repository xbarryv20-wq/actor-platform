import { Hono, Context } from "hono";
import { z } from "zod";
import { getPrisma } from "./config.js";
import { requireWorkspaceRole } from "./workspace-auth.js";
import { requireTokenScope } from "./token-scope.js";
import { assertStorageManageAccess } from "./storage-auth.js";

function getWorkspaceId(c: Context): string | Response {
  const id = c.req.param("workspaceId");
  if (!id) return c.json({ error: "Missing workspaceId in URL" }, 400);
  return id;
}

function getQueueId(c: Context): string | Response {
  const id = c.req.param("queueId");
  if (!id) return c.json({ error: "Missing queueId in URL" }, 400);
  return id;
}

function getUserId(c: Context): string {
  return c.get("userId" as never) as string;
}

const createQueueSchema = z.object({
  name: z.string().min(1, "name is required"),
  slug: z.string().min(1, "slug is required"),
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  cursor: z.string().optional(),
});

const requestQueues = new Hono();

requestQueues.get("/", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), requireTokenScope("storage:read"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;

  const rawQuery = {
    limit: c.req.query("limit"),
    cursor: c.req.query("cursor"),
  };

  const parsed = listQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return c.json({ error: "Invalid query parameters", details: parsed.error.flatten() }, 400);
  }

  const { limit, cursor } = parsed.data;
  const prisma = getPrisma();

  try {
    const items = await prisma.requestQueue.findMany({
      where: { workspaceId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    });

    const hasMore = items.length > limit;
    const queueList = hasMore ? items.slice(0, limit) : items;
    let nextCursor: string | undefined;
    if (hasMore) {
      const last = queueList.at(-1);
      if (last) nextCursor = last.id;
    }

    return c.json({ requestQueues: queueList, ...(nextCursor ? { nextCursor } : {}) });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

requestQueues.get("/:queueId", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), requireTokenScope("storage:read"), async (c) => {
  const maybeQueueId = getQueueId(c);
  if (maybeQueueId instanceof Response) return maybeQueueId;
  const queueId: string = maybeQueueId;
  const prisma = getPrisma();

  try {
    const queue = await prisma.requestQueue.findUnique({
      where: { id: queueId },
      include: { _count: { select: { items: true } } },
    });

    if (!queue) {
      return c.json({ error: "RequestQueue not found" }, 404);
    }

    return c.json(queue);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

requestQueues.post("/", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), requireTokenScope("storage:write"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;

  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = createQueueSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const { name, slug } = parsed.data;
  const ownerId = getUserId(c);
  const prisma = getPrisma();

  try {
    const queue = await prisma.requestQueue.create({
      data: { workspaceId, name, slug, ownerId },
    });

    return c.json(queue, 201);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

requestQueues.get("/:queueId/items", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), requireTokenScope("storage:read"), async (c) => {
  const maybeQueueId = getQueueId(c);
  if (maybeQueueId instanceof Response) return maybeQueueId;
  const queueId: string = maybeQueueId;

  const rawQuery = {
    limit: c.req.query("limit"),
    cursor: c.req.query("cursor"),
  };

  const parsed = listQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return c.json({ error: "Invalid query parameters", details: parsed.error.flatten() }, 400);
  }

  const { limit, cursor } = parsed.data;
  const prisma = getPrisma();

  try {
    const queue = await prisma.requestQueue.findUnique({
      where: { id: queueId },
      select: { id: true },
    });

    if (!queue) {
      return c.json({ error: "RequestQueue not found" }, 404);
    }

    const items = await prisma.requestQueueItem.findMany({
      where: { queueId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    });

    const hasMore = items.length > limit;
    const itemList = hasMore ? items.slice(0, limit) : items;
    let nextCursor: string | undefined;
    if (hasMore) {
      const last = itemList.at(-1);
      if (last) nextCursor = last.id;
    }

    return c.json({ items: itemList, ...(nextCursor ? { nextCursor } : {}) });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

requestQueues.delete("/:queueId", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), requireTokenScope("storage:write"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;
  const maybeQueueId = getQueueId(c);
  if (maybeQueueId instanceof Response) return maybeQueueId;
  const queueId: string = maybeQueueId;
  const prisma = getPrisma();

  try {
    const existing = await prisma.requestQueue.findUnique({
      where: { id: queueId },
      select: { id: true, workspaceId: true, ownerId: true },
    });

    if (!existing) {
      return c.json({ error: "RequestQueue not found" }, 404);
    }

    if (existing.workspaceId !== workspaceId) {
      return c.json({ error: "RequestQueue not found" }, 404);
    }

    const hasAccess = await assertStorageManageAccess(c, queueId, workspaceId, "requestQueue");
    if (!hasAccess) {
      return c.json({ error: "Forbidden: insufficient permissions" }, 403);
    }

    await prisma.requestQueue.delete({ where: { id: queueId } });
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

export { requestQueues };
