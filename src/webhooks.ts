import { Hono, Context } from "hono";
import { z } from "zod";
import { getPrisma } from "./config.js";
import { requireWorkspaceRole } from "./workspace-auth.js";
import { requireTokenScope } from "./token-scope.js";
import { assertWebhookManageAccess } from "./webhook-auth.js";

function getWorkspaceId(c: Context): string | Response {
  const id = c.req.param("workspaceId");
  if (!id) return c.json({ error: "Missing workspaceId in URL" }, 400);
  return id;
}

function getWebhookId(c: Context): string | Response {
  const id = c.req.param("webhookId");
  if (!id) return c.json({ error: "Missing webhookId in URL" }, 400);
  return id;
}

function getUserId(c: Context): string {
  return c.get("userId" as never) as string;
}

const createWebhookSchema = z.object({
  actorId: z.string().min(1, "actorId is required"),
  eventTypes: z.string().min(1, "eventTypes is required"),
  url: z.string().url("url must be a valid URL"),
  secret: z.string().optional(),
  enabled: z.boolean().optional().default(true),
});

const updateWebhookSchema = z.object({
  eventTypes: z.string().min(1).optional(),
  url: z.string().url("url must be a valid URL").optional(),
  secret: z.string().optional(),
  enabled: z.boolean().optional(),
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  cursor: z.string().optional(),
});

const webhooks = new Hono();

webhooks.get("/", requireTokenScope("webhooks:read"), async (c) => {
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
    const items = await prisma.webhook.findMany({
      where: { workspaceId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    });

    const hasMore = items.length > limit;
    const webhookList = hasMore ? items.slice(0, limit) : items;
    let nextCursor: string | undefined;
    if (hasMore) {
      const last = webhookList.at(-1);
      if (last) nextCursor = last.id;
    }

    return c.json({ webhooks: webhookList, ...(nextCursor ? { nextCursor } : {}) });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

webhooks.get("/:webhookId", requireTokenScope("webhooks:read"), async (c) => {
  const maybeWebhookId = getWebhookId(c);
  if (maybeWebhookId instanceof Response) return maybeWebhookId;
  const webhookId: string = maybeWebhookId;
  const prisma = getPrisma();

  try {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      return c.json({ error: "Webhook not found" }, 404);
    }

    return c.json(webhook);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

webhooks.get("/:webhookId/attempts", requireTokenScope("webhooks:read"), async (c) => {
  const maybeWebhookId = getWebhookId(c);
  if (maybeWebhookId instanceof Response) return maybeWebhookId;
  const webhookId: string = maybeWebhookId;

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
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
      select: { id: true, workspaceId: true },
    });

    if (!webhook) {
      return c.json({ error: "Webhook not found" }, 404);
    }

    const attempts = await prisma.webhookAttempt.findMany({
      where: { webhookId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    });

    const hasMore = attempts.length > limit;
    const attemptList = hasMore ? attempts.slice(0, limit) : attempts;
    let nextCursor: string | undefined;
    if (hasMore) {
      const last = attemptList.at(-1);
      if (last) nextCursor = last.id;
    }

    return c.json({ attempts: attemptList, ...(nextCursor ? { nextCursor } : {}) });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

webhooks.post("/", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), requireTokenScope("webhooks:write"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;

  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = createWebhookSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const { actorId, eventTypes, url, secret, enabled } = parsed.data;
  const ownerId = getUserId(c);
  const prisma = getPrisma();

  try {
    const actor = await prisma.actor.findUnique({
      where: { id: actorId },
      select: { workspaceId: true, id: true },
    });

    if (!actor) {
      return c.json({ error: "Actor not found" }, 404);
    }

    if (actor.workspaceId !== workspaceId) {
      return c.json({ error: "Actor not found" }, 404);
    }

    const webhook = await prisma.webhook.create({
      data: { workspaceId, actorId, eventTypes, url, secret, enabled, ownerId },
    });

    return c.json(webhook, 201);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

webhooks.patch("/:webhookId", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), requireTokenScope("webhooks:write"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;
  const maybeWebhookId = getWebhookId(c);
  if (maybeWebhookId instanceof Response) return maybeWebhookId;
  const webhookId: string = maybeWebhookId;

  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = updateWebhookSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  const result = await assertWebhookManageAccess(c, webhookId, workspaceId);
  if (!result.allowed) {
    if (result.webhook === undefined) {
      return c.json({ error: "Webhook not found" }, 404);
    }
    return c.json({ error: "Forbidden: insufficient permissions" }, 403);
  }

  const prisma = getPrisma();

  try {
    const updated = await prisma.webhook.update({
      where: { id: webhookId },
      data,
    });

    return c.json(updated);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

webhooks.delete("/:webhookId", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), requireTokenScope("webhooks:write"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;
  const maybeWebhookId = getWebhookId(c);
  if (maybeWebhookId instanceof Response) return maybeWebhookId;
  const webhookId: string = maybeWebhookId;

  const result = await assertWebhookManageAccess(c, webhookId, workspaceId);
  if (!result.allowed) {
    if (result.webhook === undefined) {
      return c.json({ error: "Webhook not found" }, 404);
    }
    return c.json({ error: "Forbidden: insufficient permissions" }, 403);
  }

  const prisma = getPrisma();

  try {
    await prisma.webhook.delete({ where: { id: webhookId } });
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

export { webhooks };
