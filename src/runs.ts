import { Hono } from "hono";
import { z } from "zod";
import { getPrisma } from "./config.js";
import type { Context } from "hono";
import { assertWorkspaceMember } from "./workspace-auth.js";
import { requireTokenScope } from "./token-scope.js";
import { triggerWebhooks } from "./webhook-trigger.js";
import { cancelRun } from "./run-executor.js";
import { createLogEntry } from "./run-logs.js";
import { validateInput } from "./input-schema.js";
import { emitEvent } from "./events.js";

function getUserId(c: Context): string {
  return c.get("userId" as never) as string;
}

const createRunSchema = z.object({
  actorId: z.string().min(1, "actorId is required"),
  workspaceId: z.string().min(1, "workspaceId is required"),
  actorVersionId: z.string().optional(),
  input: z.record(z.unknown()).optional(),
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  cursor: z.string().optional(),
});

const runs = new Hono();

runs.post("/", requireTokenScope("runs:write"), async (c) => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = createRunSchema.safeParse(raw);
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
      select: { workspaceId: true, id: true, status: true, inputSchema: true },
    });

    if (!actor) {
      return c.json({ error: "Actor not found" }, 404);
    }

    if (actor.workspaceId !== body.workspaceId) {
      return c.json({ error: "Actor does not belong to this workspace" }, 404);
    }

    if (actor.status === "DRAFT") {
      return c.json({ error: "Actor is in DRAFT state; only PUBLISHED or DEPRECATED actors can run" }, 400);
    }

    let actorVersionId = body.actorVersionId;
    let schemaForValidation = actor.inputSchema as Record<string, unknown> | undefined;

    if (actorVersionId) {
      const version = await prisma.actorVersion.findUnique({
        where: { id: actorVersionId },
        select: { actorId: true, inputSchema: true },
      });
      if (version?.actorId !== body.actorId) {
        return c.json({ error: "Actor version not found for this actor" }, 404);
      }
      schemaForValidation = version.inputSchema as Record<string, unknown> | undefined;
    } else {
      const latestVersion = await prisma.actorVersion.findFirst({
        where: { actorId: body.actorId },
        orderBy: { version: "desc" },
        select: { id: true, inputSchema: true },
      });
      if (latestVersion) {
        actorVersionId = latestVersion.id;
        schemaForValidation = latestVersion.inputSchema as Record<string, unknown> | undefined;
      }
    }

    if (schemaForValidation) {
      const result = validateInput(body.input ?? {}, schemaForValidation);
      if (!result.valid) {
        return c.json({ error: "Input validation failed", details: result.errors }, 400);
      }
    }

    const run = await prisma.actorRun.create({
      data: {
        actorId: body.actorId,
        workspaceId: body.workspaceId,
        actorVersionId,
        input: body.input as object,
        status: "PENDING",
      },
    });

    void triggerWebhooks({
      eventType: "run.created",
      workspaceId: body.workspaceId,
      actorId: body.actorId,
      payload: { id: run.id, status: run.status },
    });

    void emitEvent(prisma, {
      workspaceId: body.workspaceId,
      actorId: body.actorId,
      runId: run.id,
      type: "RUN_CREATED",
      message: `Run ${run.id.substring(0, 12)} created`,
      payload: { actorId: body.actorId, status: run.status },
    });

    return c.json(run, 201);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

runs.get("/:id", requireTokenScope("runs:read"), async (c) => {
  const id = c.req.param("id");
  const userId = getUserId(c);
  const prisma = getPrisma();

  try {
    const run = await prisma.actorRun.findUnique({
      where: { id },
    });

    if (!run) {
      return c.json({ error: "Run not found" }, 404);
    }

    const isMember = await assertWorkspaceMember(userId, run.workspaceId);
    if (!isMember) {
      return c.json({ error: "Forbidden: not a member of this workspace" }, 403);
    }

    return c.json(run);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

const updateRunSchema = z.object({
  status: z.enum(["PENDING", "RUNNING", "SUCCEEDED", "FAILED"]),
  output: z.record(z.unknown()).optional(),
  errorMessage: z.string().optional(),
});

runs.patch("/:id", requireTokenScope("runs:write"), async (c) => {
  const id = c.req.param("id");
  const userId = getUserId(c);
  const prisma = getPrisma();

  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = updateRunSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const { status, output, errorMessage } = parsed.data;

  try {
    const existing = await prisma.actorRun.findUnique({
      where: { id },
      select: { id: true, workspaceId: true, actorId: true, status: true },
    });

    if (!existing) {
      return c.json({ error: "Run not found" }, 404);
    }

    const isMember = await assertWorkspaceMember(userId, existing.workspaceId);
    if (!isMember) {
      return c.json({ error: "Forbidden: not a member of this workspace" }, 403);
    }

    const now = new Date();
    const isTerminal = status === "SUCCEEDED" || status === "FAILED";

    const updated = await prisma.actorRun.update({
      where: { id },
      data: {
        status,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        ...(output !== undefined ? { output: output as object } : {}),
        ...(errorMessage !== undefined ? { errorMessage } : {}),
        ...(status === "RUNNING" && existing.status === "PENDING" ? { startedAt: now } : {}),
        ...(isTerminal ? { finishedAt: now } : {}),
      },
    });

    if (status !== existing.status) {
      const eventType = status === "SUCCEEDED" ? "run.succeeded"
        : status === "FAILED" ? "run.failed"
        : "run.status_changed";

      void triggerWebhooks({
        eventType,
        workspaceId: existing.workspaceId,
        actorId: existing.actorId,
        payload: { id: existing.id, status, previousStatus: existing.status },
      });

      if (status === "SUCCEEDED" || status === "FAILED") {
        void emitEvent(prisma, {
          workspaceId: existing.workspaceId,
          actorId: existing.actorId,
          runId: existing.id,
          type: status === "SUCCEEDED" ? "RUN_SUCCEEDED" : "RUN_FAILED",
          message: `Run ${existing.id.substring(0, 12)} ${status === "SUCCEEDED" ? "succeeded" : "failed"}`,
          payload: { previousStatus: existing.status, ...(status === "FAILED" ? { errorMessage: errorMessage } : {}) },
        });
      }
    }

    return c.json(updated);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

async function listWorkspaceRuns(c: Context): Promise<Response> {
  const workspaceId = c.req.param("workspaceId");
  if (!workspaceId) {
    return c.json({ error: "Missing workspaceId" }, 400);
  }

  const userId = getUserId(c);
  const isMember = await assertWorkspaceMember(userId, workspaceId);
  if (!isMember) {
    return c.json({ error: "Forbidden: not a member of this workspace" }, 403);
  }

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
    const runsList = await prisma.actorRun.findMany({
      where: { workspaceId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    });

    const hasMore = runsList.length > limit;
    const items = hasMore ? runsList.slice(0, limit) : runsList;
    let nextCursor: string | undefined;
    if (hasMore) {
      const last = items.at(-1);
      if (last) {
        nextCursor = last.id;
      }
    }

    return c.json({ runs: items, ...(nextCursor ? { nextCursor } : {}) });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
}

runs.post("/:id/cancel", requireTokenScope("runs:write"), async (c) => {
  // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
  const id = c.req.param("id") as string;
  const userId = getUserId(c);
  const prisma = getPrisma();

  try {
    const run = await prisma.actorRun.findUnique({
      where: { id },
      select: { id: true, workspaceId: true, actorId: true, status: true },
    });

    if (!run) {
      return c.json({ error: "Run not found" }, 404);
    }

    const isMember = await assertWorkspaceMember(userId, run.workspaceId);
    if (!isMember) {
      return c.json({ error: "Forbidden" }, 403);
    }

    if (run.status === "SUCCEEDED" || run.status === "FAILED" || run.status === "CANCELED") {
      return c.json({ error: `Run is already ${run.status.toLowerCase()}` }, 409);
    }

    let canceled = false;

    if (run.status === "PENDING") {
      const { count } = await prisma.actorRun.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "CANCELED", finishedAt: new Date() },
      });
      canceled = count > 0;
    } else {
      const { count } = await prisma.actorRun.updateMany({
        where: { id, status: "RUNNING" },
        data: { status: "CANCELED", finishedAt: new Date() },
      });
      canceled = count > 0;
      if (canceled) {
        cancelRun(id);
      }
    }

    if (!canceled) {
      return c.json({ error: "Run status changed before cancellation could complete" }, 409);
    }

    await createLogEntry(prisma, id, {
      level: "INFO",
      message: `Run canceled by user ${userId}`,
    });

    void triggerWebhooks({
      eventType: "run.canceled",
      workspaceId: run.workspaceId,
      actorId: run.actorId,
      payload: { id, status: "CANCELED" },
    });

    void emitEvent(prisma, {
      workspaceId: run.workspaceId,
      actorId: run.actorId,
      runId: id,
      type: "RUN_CANCELED",
      message: `Run ${id.substring(0, 12)} canceled`,
      payload: { previousStatus: run.status },
    });

    return c.json({ id, status: "CANCELED" });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

const logQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  cursor: z.string().optional(),
});

runs.get("/:id/logs", requireTokenScope("runs:read"), async (c) => {
  const id = c.req.param("id");
  const userId = getUserId(c);
  const prisma = getPrisma();

  try {
    const run = await prisma.actorRun.findUnique({
      where: { id },
      select: { id: true, workspaceId: true },
    });

    if (!run) {
      return c.json({ error: "Run not found" }, 404);
    }

    const isMember = await assertWorkspaceMember(userId, run.workspaceId);
    if (!isMember) {
      return c.json({ error: "Forbidden: not a member of this workspace" }, 403);
    }

    const rawQuery = {
      limit: c.req.query("limit"),
      cursor: c.req.query("cursor"),
    };

    const parsed = logQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return c.json({ error: "Invalid query parameters", details: parsed.error.flatten() }, 400);
    }

    const { limit, cursor } = parsed.data;
    const items = await prisma.logEntry.findMany({
      where: { runId: id },
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

    return c.json({ logs, ...(nextCursor ? { nextCursor } : {}) });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

export { runs, listWorkspaceRuns };
