import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import { assertWorkspaceMember } from "./workspace-auth.js";
import { requireTokenScope } from "./token-scope.js";
import { listWorkspaceEvents } from "./events.js";

function getUserId(c: Context): string {
  return c.get("userId" as never) as string;
}

const listEventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
  types: z.string().optional(),
});

const events = new Hono();

events.get("/", requireTokenScope("runs:read"), async (c) => {
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
    types: c.req.query("types"),
  };

  const parsed = listEventsQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return c.json({ error: "Invalid query parameters", details: parsed.error.flatten() }, 400);
  }

  const { limit, cursor, types } = parsed.data;

  try {
    const result = await listWorkspaceEvents(workspaceId, {
      limit,
      cursor,
      types: types ? types.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean) : undefined,
    });
    return c.json(result);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

export { events };
