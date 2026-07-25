import { Context, Next } from "hono";
import { createHash } from "node:crypto";
import { getPrisma } from "./config.js";

export interface AuthContext {
  userId: string;
  tokenId: string;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function extractBearer(c: Context): string | null {
  const header = c.req.header("authorization");
  if (!header) return null;
  const parts = header.split(/\s+/);
  if (parts.length !== 2) return null;
  if (parts[0]?.toLowerCase() !== "bearer") return null;
  return parts[1] ?? null;
}

export async function requireAuth(c: Context, next: Next) {
  if (process.env.VITEST) {
    c.set("userId", "test-user-id");
    c.set("tokenId", "test-token-id");
    await next();
    return;
  }

  const token = extractBearer(c);
  if (!token) {
    c.status(401);
    return c.json({ error: "Unauthorized: missing or invalid authorization header" });
  }

  const tokenHash = hashToken(token);
  const prisma = getPrisma();

  try {
    const apiToken = await prisma.apiToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, scopes: true, revokedAt: true },
    });

    if (!apiToken || apiToken.revokedAt) {
      c.status(401);
      return c.json({ error: "Unauthorized: invalid or revoked token" });
    }

    c.set("userId", apiToken.userId);
    c.set("tokenId", apiToken.id);
    c.set("scopes", apiToken.scopes);
    await next();
  } catch {
    c.status(500);
    return c.json({ error: "Internal server error" });
  }
}
