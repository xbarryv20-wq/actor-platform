import { Hono } from "hono";
import { getPrisma } from "./config.js";
import { requireTokenScope } from "./token-scope.js";

const admin = new Hono();

admin.get("/workspaces", requireTokenScope("workspace:write"), async (c) => {
  const prisma = getPrisma();
  try {
    const workspaces = await prisma.workspace.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return c.json({ workspaces });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

admin.get("/users", requireTokenScope("workspace:write"), async (c) => {
  const prisma = getPrisma();
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return c.json({ users });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

export { admin };
