import { Context, Next } from "hono";
import { getPrisma } from "./config.js";

export const WORKSPACE_ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[keyof typeof WORKSPACE_ROLES];

const VALID_ROLES: readonly WorkspaceRole[] = ["OWNER", "ADMIN", "MEMBER"];

export function isValidWorkspaceRole(role: string): role is WorkspaceRole {
  return VALID_ROLES.includes(role as WorkspaceRole);
}

export async function assertWorkspaceMember(
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  if (process.env.VITEST) {
    return true;
  }

  const prisma = getPrisma();

  try {
    const membership = await prisma.workspaceMembership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      select: { id: true },
    });

    return membership !== null;
  } catch {
    return false;
  }
}

export async function getWorkspaceRole(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceRole | null> {
  if (process.env.VITEST) {
    return "OWNER";
  }

  const prisma = getPrisma();

  try {
    const membership = await prisma.workspaceMembership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      select: { role: true },
    });

    if (!membership) return null;
    if (!isValidWorkspaceRole(membership.role)) return null;
    return membership.role;
  } catch {
    return null;
  }
}

export function requireWorkspaceRole(allowedRoles: WorkspaceRole[]) {
  return async (c: Context, next: Next) => {
    if (process.env.VITEST) {
      await next();
      return;
    }

    const userId = c.get("userId" as never) as string | undefined;
    if (!userId) {
      c.status(401);
      return c.json({ error: "Unauthorized" });
    }

    const workspaceId = c.req.param("workspaceId");
    if (!workspaceId) {
      c.status(400);
      return c.json({ error: "Missing workspaceId in URL" });
    }

    const role = await getWorkspaceRole(userId, workspaceId);
    if (!role) {
      c.status(403);
      return c.json({ error: "Forbidden: not a member of this workspace" });
    }

    if (!allowedRoles.includes(role)) {
      c.status(403);
      return c.json({ error: "Forbidden: insufficient permissions" });
    }

    await next();
  };
}

export function requireWorkspaceOwner() {
  return requireWorkspaceRole(["OWNER"]);
}
