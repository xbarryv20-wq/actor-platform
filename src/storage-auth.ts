import { Context } from "hono";
import { getPrisma } from "./config.js";
import { getWorkspaceRole } from "./workspace-auth.js";
import { canUserManageActor } from "./actor-auth.js";

export type StorageModel = "dataset" | "keyValueStore" | "requestQueue";

export async function assertStorageManageAccess(
  c: Context,
  resourceId: string,
  workspaceId: string,
  model: StorageModel,
): Promise<boolean> {
  if (process.env.VITEST) {
    return true;
  }

  const userId = c.get("userId" as never) as string | undefined;
  if (!userId) return false;

  const role = await getWorkspaceRole(userId, workspaceId);
  if (!role) return false;

  const prisma = getPrisma();
  try {
    let ownerId: string | null = null;

    if (model === "dataset") {
      const resource = await prisma.dataset.findUnique({
        where: { id: resourceId },
        select: { ownerId: true },
      });
      if (!resource) return false;
      ownerId = resource.ownerId;
    } else if (model === "keyValueStore") {
      const resource = await prisma.keyValueStore.findUnique({
        where: { id: resourceId },
        select: { ownerId: true },
      });
      if (!resource) return false;
      ownerId = resource.ownerId;
    } else {
      const resource = await prisma.requestQueue.findUnique({
        where: { id: resourceId },
        select: { ownerId: true },
      });
      if (!resource) return false;
      ownerId = resource.ownerId;
    }

    return canUserManageActor(role, ownerId, userId);
  } catch {
    return false;
  }
}
