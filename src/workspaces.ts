import { Hono, Context } from "hono";
import { z } from "zod";
import { getPrisma } from "./config.js";
import {
  requireWorkspaceRole,
  requireWorkspaceOwner,
  isValidWorkspaceRole,
  getWorkspaceRole,
  WORKSPACE_ROLES,
} from "./workspace-auth.js";
import { requireTokenScope } from "./token-scope.js";

function getWorkspaceId(c: Context): string | Response {
  const id = c.req.param("workspaceId");
  if (!id) return c.json({ error: "Missing workspaceId in URL" }, 400);
  return id;
}

function getTargetUserId(c: Context): string | Response {
  const id = c.req.param("userId");
  if (!id) return c.json({ error: "Missing userId in URL" }, 400);
  return id;
}

const addMemberSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  role: z
    .string()
    .refine(isValidWorkspaceRole, "Role must be OWNER, ADMIN, or MEMBER"),
});

const updateMemberRoleSchema = z.object({
  role: z
    .string()
    .refine(isValidWorkspaceRole, "Role must be OWNER, ADMIN, or MEMBER"),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
});

const workspaces = new Hono();

workspaces.get("/", requireTokenScope("workspace:read"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;
  const prisma = getPrisma();

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        slug: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!workspace) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    return c.json(workspace);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

workspaces.patch("/", requireWorkspaceRole(["OWNER", "ADMIN"]), requireTokenScope("workspace:write"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;

  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = updateWorkspaceSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  const prisma = getPrisma();

  try {
    if (data.slug) {
      const existing = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { organizationId: true },
      });
      if (existing) {
        const conflict = await prisma.workspace.findFirst({
          where: { organizationId: existing.organizationId, slug: data.slug, id: { not: workspaceId } },
          select: { id: true },
        });
        if (conflict) {
          return c.json({ error: "Slug is already in use by another workspace in this organization" }, 409);
        }
      }
    }

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return c.json(updated);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

workspaces.get("/members", requireTokenScope("workspace:read"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;
  const prisma = getPrisma();

  try {
    const members = await prisma.workspaceMembership.findMany({
      where: { workspaceId },
      select: {
        id: true,
        userId: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return c.json({ members });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

workspaces.post("/members", requireWorkspaceRole(["OWNER", "ADMIN"]), requireTokenScope("workspace:write"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;

  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = addMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const { userId, role } = parsed.data;

  if (role === WORKSPACE_ROLES.OWNER) {
    const currentUserId = c.get("userId" as never) as string;
    const currentRole = await getWorkspaceRole(currentUserId, workspaceId);
    if (currentRole !== WORKSPACE_ROLES.OWNER) {
      return c.json({ error: "Forbidden: only owners can assign the OWNER role" }, 403);
    }
  }

  const prisma = getPrisma();

  try {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!existing) {
      return c.json({ error: "User not found" }, 404);
    }

    const membership = await prisma.workspaceMembership.create({
      data: { userId, workspaceId, role },
      select: { id: true, userId: true, role: true, createdAt: true },
    });

    return c.json(membership, 201);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

workspaces.patch("/members/:userId", requireWorkspaceOwner(), requireTokenScope("workspace:write"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;
  const maybeTargetId = getTargetUserId(c);
  if (maybeTargetId instanceof Response) return maybeTargetId;
  const targetUserId: string = maybeTargetId;

  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = updateMemberRoleSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const { role } = parsed.data;
  const prisma = getPrisma();

  try {
    const membership = await prisma.workspaceMembership.findUnique({
      where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
      select: { id: true, role: true },
    });

    if (!membership) {
      return c.json({ error: "Membership not found" }, 404);
    }

    const updated = await prisma.workspaceMembership.update({
      where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
      data: { role },
      select: { id: true, userId: true, role: true, createdAt: true },
    });

    return c.json(updated);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

workspaces.delete("/members/:userId", requireWorkspaceOwner(), requireTokenScope("workspace:write"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;
  const maybeTargetId = getTargetUserId(c);
  if (maybeTargetId instanceof Response) return maybeTargetId;
  const targetUserId: string = maybeTargetId;
  const prisma = getPrisma();

  try {
    const membership = await prisma.workspaceMembership.findUnique({
      where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
      select: { id: true, role: true },
    });

    if (!membership) {
      return c.json({ error: "Membership not found" }, 404);
    }

    if (membership.role === WORKSPACE_ROLES.OWNER) {
      const ownerCount = await prisma.workspaceMembership.count({
        where: { workspaceId, role: WORKSPACE_ROLES.OWNER },
      });
      if (ownerCount <= 1) {
        return c.json({ error: "Cannot remove the last owner of the workspace" }, 400);
      }
    }

    await prisma.workspaceMembership.delete({
      where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
    });

    return c.json({ success: true });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

export { workspaces };
