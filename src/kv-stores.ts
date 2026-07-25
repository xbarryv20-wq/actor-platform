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

function getStoreId(c: Context): string | Response {
  const id = c.req.param("storeId");
  if (!id) return c.json({ error: "Missing storeId in URL" }, 400);
  return id;
}

function getUserId(c: Context): string {
  return c.get("userId" as never) as string;
}

const createStoreSchema = z.object({
  name: z.string().min(1, "name is required"),
  slug: z.string().min(1, "slug is required"),
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  cursor: z.string().optional(),
});

const kvStores = new Hono();

kvStores.get("/", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), requireTokenScope("storage:read"), async (c) => {
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
    const items = await prisma.keyValueStore.findMany({
      where: { workspaceId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    });

    const hasMore = items.length > limit;
    const storeList = hasMore ? items.slice(0, limit) : items;
    let nextCursor: string | undefined;
    if (hasMore) {
      const last = storeList.at(-1);
      if (last) nextCursor = last.id;
    }

    return c.json({ keyValueStores: storeList, ...(nextCursor ? { nextCursor } : {}) });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

kvStores.get("/:storeId", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), requireTokenScope("storage:read"), async (c) => {
  const maybeStoreId = getStoreId(c);
  if (maybeStoreId instanceof Response) return maybeStoreId;
  const storeId: string = maybeStoreId;
  const prisma = getPrisma();

  try {
    const store = await prisma.keyValueStore.findUnique({
      where: { id: storeId },
      include: { _count: { select: { records: true } } },
    });

    if (!store) {
      return c.json({ error: "KeyValueStore not found" }, 404);
    }

    return c.json(store);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

kvStores.post("/", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), requireTokenScope("storage:write"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;

  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = createStoreSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const { name, slug } = parsed.data;
  const ownerId = getUserId(c);
  const prisma = getPrisma();

  try {
    const store = await prisma.keyValueStore.create({
      data: { workspaceId, name, slug, ownerId },
    });

    return c.json(store, 201);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

kvStores.get("/:storeId/records", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), requireTokenScope("storage:read"), async (c) => {
  const maybeStoreId = getStoreId(c);
  if (maybeStoreId instanceof Response) return maybeStoreId;
  const storeId: string = maybeStoreId;

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
    const store = await prisma.keyValueStore.findUnique({
      where: { id: storeId },
      select: { id: true },
    });

    if (!store) {
      return c.json({ error: "KeyValueStore not found" }, 404);
    }

    const items = await prisma.keyValueRecord.findMany({
      where: { storeId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    });

    const hasMore = items.length > limit;
    const recordList = hasMore ? items.slice(0, limit) : items;
    let nextCursor: string | undefined;
    if (hasMore) {
      const last = recordList.at(-1);
      if (last) nextCursor = last.id;
    }

    return c.json({ records: recordList, ...(nextCursor ? { nextCursor } : {}) });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

kvStores.delete("/:storeId", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), requireTokenScope("storage:write"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;
  const maybeStoreId = getStoreId(c);
  if (maybeStoreId instanceof Response) return maybeStoreId;
  const storeId: string = maybeStoreId;
  const prisma = getPrisma();

  try {
    const existing = await prisma.keyValueStore.findUnique({
      where: { id: storeId },
      select: { id: true, workspaceId: true, ownerId: true },
    });

    if (!existing) {
      return c.json({ error: "KeyValueStore not found" }, 404);
    }

    if (existing.workspaceId !== workspaceId) {
      return c.json({ error: "KeyValueStore not found" }, 404);
    }

    const hasAccess = await assertStorageManageAccess(c, storeId, workspaceId, "keyValueStore");
    if (!hasAccess) {
      return c.json({ error: "Forbidden: insufficient permissions" }, 403);
    }

    await prisma.keyValueStore.delete({ where: { id: storeId } });
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

export { kvStores };
