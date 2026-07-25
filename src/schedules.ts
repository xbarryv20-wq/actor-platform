import { Hono, Context } from "hono";
import { z } from "zod";
import { getPrisma } from "./config.js";
import { assertWorkspaceMember } from "./workspace-auth.js";
import { requireTokenScope } from "./token-scope.js";

function getUserId(c: Context): string {
  return c.get("userId" as never) as string;
}

const cronRanges: [number, number][] = [
  [0, 59],
  [0, 23],
  [1, 31],
  [1, 12],
  [0, 7],
];

function isValidCron(cron: string): boolean {
  const fields = cron.trim().split(/\s+/);
  if (fields.length !== 5) return false;

  const fieldPattern = /^(\*|\d+(-\d+)?(\/\d+)?)(,\d+(-\d+)?(\/\d+)?)*$/;

  for (let i = 0; i < 5; i++) {
    const field = fields[i];
    const range = cronRanges[i];
    if (!field || !range) return false;
    if (!fieldPattern.test(field)) return false;
    const nums = field.match(/\d+/g)?.map(Number) ?? [];
    for (const n of nums) {
      if (n < range[0] || n > range[1]) return false;
    }
  }

  return true;
}

const createScheduleSchema = z.object({
  workspaceId: z.string().min(1, "workspaceId is required"),
  actorId: z.string().min(1, "actorId is required"),
  actorVersionId: z.string().optional(),
  cron: z
    .string()
    .min(1, "cron is required")
    .refine(isValidCron, "Invalid cron expression"),
  input: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional().default(true),
});

const updateScheduleSchema = z.object({
  cron: z.string().min(1).refine(isValidCron, "Invalid cron expression").optional(),
  enabled: z.boolean().optional(),
  input: z.record(z.unknown()).optional(),
  actorVersionId: z.string().optional(),
});

const schedules = new Hono();

schedules.post("/", requireTokenScope("schedules:write"), async (c) => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = createScheduleSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const body = parsed.data;
  const userId = getUserId(c);

  const isMember = await assertWorkspaceMember(userId, body.workspaceId);
  if (!isMember) {
    return c.json({ error: "Forbidden: not a member of this workspace" }, 403);
  }

  const prisma = getPrisma();

  try {
    const actor = await prisma.actor.findUnique({
      where: { id: body.actorId },
      select: { workspaceId: true, id: true },
    });

    if (!actor) {
      return c.json({ error: "Actor not found" }, 404);
    }

    if (actor.workspaceId !== body.workspaceId) {
      return c.json({ error: "Actor does not belong to this workspace" }, 404);
    }

    const schedule = await prisma.schedule.create({
      data: {
        workspaceId: body.workspaceId,
        actorId: body.actorId,
        actorVersionId: body.actorVersionId,
        cronExpression: body.cron,
        inputOverride: body.input as object,
        enabled: body.enabled,
      },
    });

    return c.json(schedule, 201);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

schedules.get("/:id", requireTokenScope("schedules:read"), async (c) => {
  const id = c.req.param("id");
  const prisma = getPrisma();

  try {
    const schedule = await prisma.schedule.findUnique({ where: { id } });
    if (!schedule) {
      return c.json({ error: "Schedule not found" }, 404);
    }

    const userId = getUserId(c);
    const isMember = await assertWorkspaceMember(userId, schedule.workspaceId);
    if (!isMember) {
      return c.json({ error: "Forbidden: not a member of this workspace" }, 403);
    }

    return c.json(schedule, 200);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

schedules.patch("/:id", requireTokenScope("schedules:write"), async (c) => {
  const id = c.req.param("id");

  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = updateScheduleSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const body = parsed.data;
  if (Object.keys(body).length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  const prisma = getPrisma();

  try {
    const existing = await prisma.schedule.findUnique({ where: { id } });
    if (!existing) {
      return c.json({ error: "Schedule not found" }, 404);
    }

    const userId = getUserId(c);
    const isMember = await assertWorkspaceMember(userId, existing.workspaceId);
    if (!isMember) {
      return c.json({ error: "Forbidden: not a member of this workspace" }, 403);
    }

    const data: Record<string, unknown> = {};
    if (body.cron !== undefined) data.cronExpression = body.cron;
    if (body.enabled !== undefined) data.enabled = body.enabled;
    if (body.input !== undefined) data.inputOverride = body.input;
    if (body.actorVersionId !== undefined) data.actorVersionId = body.actorVersionId;

    const updated = await prisma.schedule.update({
      where: { id },
      data,
    });

    return c.json(updated);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

async function listWorkspaceSchedules(c: Context): Promise<Response> {
  const workspaceId = c.req.param("workspaceId");
  if (!workspaceId) {
    return c.json({ error: "Missing workspaceId" }, 400);
  }

  const userId = getUserId(c);

  const isMember = await assertWorkspaceMember(userId, workspaceId);
  if (!isMember) {
    return c.json({ error: "Forbidden: not a member of this workspace" }, 403);
  }

  const limitParam = c.req.query("limit");
  const cursor = c.req.query("cursor");

  let limit = 10;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (isNaN(parsed) || parsed < 1) {
      return c.json({ error: "limit must be a positive integer" }, 400);
    }
    limit = Math.min(parsed, 100);
  }

  const prisma = getPrisma();

  try {
    const schedules = await prisma.schedule.findMany({
      where: { workspaceId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    });

    let nextCursor: string | null = null;
    if (schedules.length > limit) {
      schedules.pop();
      nextCursor = schedules[schedules.length - 1]?.id ?? null;
    }

    return c.json({ schedules, nextCursor }, 200);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
};

export { schedules, listWorkspaceSchedules };
