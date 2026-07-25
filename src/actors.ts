import { Hono, Context } from "hono";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { getPrisma } from "./config.js";
import { requireWorkspaceRole } from "./workspace-auth.js";
import { requireTokenScope } from "./token-scope.js";
import { assertActorManageAccess } from "./actor-auth.js";
import { computeTransition } from "./actor-lifecycle.js";
import { emitEvent } from "./events.js";

function getWorkspaceId(c: Context): string | Response {
  const id = c.req.param("workspaceId");
  if (!id) return c.json({ error: "Missing workspaceId in URL" }, 400);
  return id;
}

function getActorId(c: Context): string | Response {
  const id = c.req.param("actorId");
  if (!id) return c.json({ error: "Missing actorId in URL" }, 400);
  return id;
}

const createActorSchema = z.object({
  name: z.string().min(1, "name is required"),
  slug: z.string().min(1, "slug is required"),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  icon: z.string().max(256).optional(),
  inputSchema: z.record(z.unknown()).optional(),
});

const updateActorSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  icon: z.string().max(256).optional(),
  inputSchema: z.record(z.unknown()).optional(),
});

const transitionActionSchema = z.object({
  action: z.enum(["publish", "deprecate", "republish"]),
  changelog: z.string().optional(),
});

const listActorsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  cursor: z.string().optional(),
});

const actors = new Hono();

actors.get("/", requireTokenScope("actors:read"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;

  const rawQuery = {
    limit: c.req.query("limit"),
    cursor: c.req.query("cursor"),
  };

  const parsed = listActorsQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return c.json({ error: "Invalid query parameters", details: parsed.error.flatten() }, 400);
  }

  const { limit, cursor } = parsed.data;
  const prisma = getPrisma();

  try {
    const items = await prisma.actor.findMany({
      where: { workspaceId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    });

    const hasMore = items.length > limit;
    const actorsList = hasMore ? items.slice(0, limit) : items;
    let nextCursor: string | undefined;
    if (hasMore) {
      const last = actorsList.at(-1);
      if (last) nextCursor = last.id;
    }

    return c.json({ actors: actorsList, ...(nextCursor ? { nextCursor } : {}) });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

actors.get("/:actorId", requireTokenScope("actors:read"), async (c) => {
  const maybeActorId = getActorId(c);
  if (maybeActorId instanceof Response) return maybeActorId;
  const actorId: string = maybeActorId;
  const prisma = getPrisma();

  try {
    const actor = await prisma.actor.findUnique({
      where: { id: actorId },
    });

    if (!actor) {
      return c.json({ error: "Actor not found" }, 404);
    }

    return c.json(actor);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

actors.post("/", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), requireTokenScope("actors:write"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;

  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = createActorSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const { name, slug, description, tags, icon, inputSchema } = parsed.data;
  const ownerId = c.get("userId" as never) as string | undefined;
  const prisma = getPrisma();

  try {
    const actor = await prisma.actor.create({
      data: { workspaceId, name, slug, description, tags: tags ?? [], icon, inputSchema: inputSchema as Prisma.InputJsonValue | undefined, ownerId: ownerId ?? null },
    });

    return c.json(actor, 201);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

actors.patch("/:actorId", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), requireTokenScope("actors:write"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;
  const maybeActorId = getActorId(c);
  if (maybeActorId instanceof Response) return maybeActorId;
  const actorId: string = maybeActorId;

  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = updateActorSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  const prisma = getPrisma();

  try {
    const existing = await prisma.actor.findUnique({
      where: { id: actorId },
      select: { id: true, workspaceId: true, ownerId: true },
    });

    if (!existing) {
      return c.json({ error: "Actor not found" }, 404);
    }

    if (existing.workspaceId !== workspaceId) {
      return c.json({ error: "Actor not found" }, 404);
    }

    const hasAccess = await assertActorManageAccess(c, actorId, workspaceId, existing);
    if (!hasAccess) {
      return c.json({ error: "Forbidden: insufficient permissions" }, 403);
    }

    const updated = await prisma.actor.update({
      where: { id: actorId },
      data: data as Prisma.ActorUpdateInput,
    });

    return c.json(updated);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

actors.delete("/:actorId", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), requireTokenScope("actors:write"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;
  const maybeActorId = getActorId(c);
  if (maybeActorId instanceof Response) return maybeActorId;
  const actorId: string = maybeActorId;
  const prisma = getPrisma();

  try {
    const existing = await prisma.actor.findUnique({
      where: { id: actorId },
      select: { id: true, workspaceId: true, ownerId: true },
    });

    if (!existing) {
      return c.json({ error: "Actor not found" }, 404);
    }

    if (existing.workspaceId !== workspaceId) {
      return c.json({ error: "Actor not found" }, 404);
    }

    const hasAccess = await assertActorManageAccess(c, actorId, workspaceId, existing);
    if (!hasAccess) {
      return c.json({ error: "Forbidden: insufficient permissions" }, 403);
    }

    await prisma.actor.delete({ where: { id: actorId } });
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

actors.get("/:actorId/versions", requireTokenScope("actors:read"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;
  const maybeActorId = getActorId(c);
  if (maybeActorId instanceof Response) return maybeActorId;
  const actorId: string = maybeActorId;
  const prisma = getPrisma();

  try {
    const existing = await prisma.actor.findUnique({
      where: { id: actorId },
      select: { id: true, workspaceId: true },
    });

    if (!existing) {
      return c.json({ error: "Actor not found" }, 404);
    }

    if (existing.workspaceId !== workspaceId) {
      return c.json({ error: "Actor not found" }, 404);
    }

    const versions = await prisma.actorVersion.findMany({
      where: { actorId },
      orderBy: { version: "desc" },
    });

    return c.json({ versions });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

actors.post("/:actorId/transition", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), requireTokenScope("actors:write"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;
  const maybeActorId = getActorId(c);
  if (maybeActorId instanceof Response) return maybeActorId;
  const actorId: string = maybeActorId;

  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = transitionActionSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "Invalid transition action", details: parsed.error.flatten() }, 400);
  }

  const { action, changelog } = parsed.data;
  const prisma = getPrisma();

  try {
    const existing = await prisma.actor.findUnique({
      where: { id: actorId },
      select: { id: true, workspaceId: true, ownerId: true, status: true, inputSchema: true },
    });

    if (!existing) {
      return c.json({ error: "Actor not found" }, 404);
    }

    if (existing.workspaceId !== workspaceId) {
      return c.json({ error: "Actor not found" }, 404);
    }

    const hasAccess = await assertActorManageAccess(c, actorId, workspaceId, existing);
    if (!hasAccess) {
      return c.json({ error: "Forbidden: insufficient permissions" }, 403);
    }

    const result = computeTransition(existing.status, action);
    if (!result.allowed) {
      return c.json({
        error: `Invalid transition: cannot ${action} an actor with status ${result.currentStatus}`,
        currentStatus: result.currentStatus,
        allowedActions: result.allowedActions,
      }, 422);
    }

    const targetStatus = result.nextStatus;

    if (action === "publish" || action === "republish") {
      const latestVersion = await prisma.actorVersion.findFirst({
        where: { actorId },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const nextVersion = (latestVersion?.version ?? 0) + 1;

      await prisma.actorVersion.create({
        data: {
          actorId,
          version: nextVersion,
          inputSchema: existing.inputSchema as Prisma.InputJsonValue | undefined,
          changelog: changelog ?? null,
        },
      });
    }

    const updated = await prisma.actor.update({
      where: { id: actorId },
      data: { status: targetStatus },
    });

    if (action === "publish") {
      void emitEvent(prisma, {
        workspaceId,
        actorId,
        type: "ACTOR_PUBLISHED",
        message: `Actor ${updated.name} published`,
        payload: { name: updated.name, slug: updated.slug },
      });
    }

    return c.json(updated);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

export { actors };
