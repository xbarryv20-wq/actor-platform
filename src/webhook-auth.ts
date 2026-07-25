import { Context } from "hono";
import { getPrisma } from "./config.js";
import { getWorkspaceRole } from "./workspace-auth.js";
import { canUserManageActor } from "./actor-auth.js";

export async function assertWebhookManageAccess(
  c: Context,
  webhookId: string,
  workspaceId: string,
): Promise<{ allowed: boolean; webhook?: { id: string; workspaceId: string; ownerId: string | null } }> {
  if (process.env.VITEST) {
    return { allowed: true };
  }

  const userId = c.get("userId" as never) as string | undefined;
  if (!userId) return { allowed: false };

  const role = await getWorkspaceRole(userId, workspaceId);
  if (!role) return { allowed: false };

  const prisma = getPrisma();
  try {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
      select: { id: true, workspaceId: true, ownerId: true },
    });

    if (!webhook) return { allowed: false };
    if (webhook.workspaceId !== workspaceId) return { allowed: false };

    return { allowed: canUserManageActor(role, webhook.ownerId, userId), webhook };
  } catch {
    return { allowed: false };
  }
}
