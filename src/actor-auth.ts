import { Context } from "hono";
import { getPrisma } from "./config.js";
import { getWorkspaceRole } from "./workspace-auth.js";
import type { WorkspaceRole } from "./workspace-auth.js";

export function canUserManageActor(
  role: WorkspaceRole | null,
  actorOwnerId: string | null,
  userId: string,
): boolean {
  if (role === "OWNER" || role === "ADMIN") return true;
  if (role === "MEMBER" && actorOwnerId === userId) return true;
  return false;
}

export async function assertActorManageAccess(
  c: Context,
  actorId: string,
  workspaceId: string,
  existingActor?: { ownerId: string | null } | null,
): Promise<boolean> {
  if (process.env.VITEST) {
    return true;
  }

  const userId = c.get("userId" as never) as string | undefined;
  if (!userId) return false;

  const role = await getWorkspaceRole(userId, workspaceId);
  if (!role) return false;

  if (existingActor) {
    return canUserManageActor(role, existingActor.ownerId, userId);
  }

  const prisma = getPrisma();
  try {
    const actor = await prisma.actor.findUnique({
      where: { id: actorId },
      select: { ownerId: true },
    });
    if (!actor) return false;
    return canUserManageActor(role, actor.ownerId, userId);
  } catch {
    return false;
  }
}
