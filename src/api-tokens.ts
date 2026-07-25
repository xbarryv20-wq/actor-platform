import { Hono, Context } from "hono";
import { z } from "zod";
import { createHash } from "node:crypto";
import { getPrisma } from "./config.js";
import { requireWorkspaceRole, getWorkspaceRole, assertWorkspaceMember } from "./workspace-auth.js";
import {
  requireTokenScope,
  validateScopes,
  DEFAULT_SCOPES,
  MEMBER_ALLOWED_SCOPES,
} from "./token-scope.js";

function getUserId(c: Context): string {
  return c.get("userId" as never) as string;
}

function getWorkspaceId(c: Context): string | Response {
  const id = c.req.param("workspaceId");
  if (!id) return c.json({ error: "Missing workspaceId in URL" }, 400);
  return id;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const createTokenSchema = z.object({
  label: z.string().min(1, "label is required"),
  userId: z.string().min(1, "userId is required"),
  scopes: z.array(z.string()).optional(),
});

const apiTokens = new Hono();

apiTokens.get("/", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), requireTokenScope("tokens:read"), async (c) => {
  const prisma = getPrisma();

  try {
    const userId = c.get("userId" as never) as string;
    const tokens = await prisma.apiToken.findMany({
      where: { userId },
      select: {
        id: true,
        label: true,
        createdAt: true,
        lastUsedAt: true,
        revokedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return c.json({ tokens });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

apiTokens.post("/", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), requireTokenScope("tokens:write"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;

  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = createTokenSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const { label, userId: targetUserId, scopes: inputScopes } = parsed.data;
  const authenticatedUserId = getUserId(c);

  const role = await getWorkspaceRole(authenticatedUserId, workspaceId);

  if (role === "OWNER" || role === "ADMIN") {
    const isTargetMember = await assertWorkspaceMember(targetUserId, workspaceId);
    if (!isTargetMember) {
      return c.json({ error: "User is not a member of this workspace" }, 400);
    }
  } else {
    if (targetUserId !== authenticatedUserId) {
      return c.json({ error: "Forbidden: insufficient permissions" }, 403);
    }
  }

  let scopes: string;
  if (inputScopes && inputScopes.length > 0) {
    const invalid = validateScopes(inputScopes);
    if (invalid.length > 0) {
      return c.json({ error: `Invalid scopes: ${invalid.join(", ")}` }, 400);
    }
    if (role !== "OWNER" && role !== "ADMIN") {
      const notAllowed = inputScopes.filter((s) => !MEMBER_ALLOWED_SCOPES.includes(s));
      if (notAllowed.length > 0) {
        return c.json({ error: `Scopes not allowed for MEMBER: ${notAllowed.join(", ")}` }, 403);
      }
    }
    scopes = inputScopes.join(",");
  } else {
    scopes = DEFAULT_SCOPES.join(",");
  }

  const rawToken = `tok_${createHash("sha256").update(`${targetUserId}_${String(Date.now())}_${String(Math.random())}`).digest("hex").slice(0, 24)}`;
  const tokenHash = hashToken(rawToken);
  const prisma = getPrisma();

  try {
    const token = await prisma.apiToken.create({
      data: { userId: targetUserId, label, tokenHash, scopes },
      select: { id: true, label: true, scopes: true, createdAt: true },
    });

    return c.json({ ...token, token: rawToken }, 201);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

apiTokens.post("/:tokenId/revoke", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), requireTokenScope("tokens:write"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;

  const tokenId = c.req.param("tokenId");
  const authenticatedUserId = getUserId(c);

  const role = await getWorkspaceRole(authenticatedUserId, workspaceId);

  const prisma = getPrisma();

  try {
    const existing = await prisma.apiToken.findUnique({
      where: { id: tokenId },
      select: { id: true, userId: true },
    });

    if (!existing) {
      return c.json({ error: "Token not found" }, 404);
    }

    if (role !== "OWNER" && role !== "ADMIN" && existing.userId !== authenticatedUserId) {
      return c.json({ error: "Forbidden: insufficient permissions" }, 403);
    }

    await prisma.apiToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    });

    return c.json({ success: true });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

export { apiTokens };
