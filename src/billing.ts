import { Hono, Context } from "hono";
import { z } from "zod";
import { getPrisma } from "./config.js";
import { requireWorkspaceOwner, requireWorkspaceRole } from "./workspace-auth.js";
import { requireTokenScope } from "./token-scope.js";

function getWorkspaceId(c: Context): string | Response {
  const id = c.req.param("workspaceId");
  if (!id) return c.json({ error: "Missing workspaceId in URL" }, 400);
  return id;
}

const billing = new Hono();

billing.get("/plans", async (c) => {
  const prisma = getPrisma();
  try {
    const plans = await prisma.plan.findMany({ orderBy: { priceCents: "asc" } });
    return c.json({ plans });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

const workspaceBilling = new Hono();

workspaceBilling.get("/subscription", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), requireTokenScope("workspace:read"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;
  const prisma = getPrisma();

  try {
    const sub = await prisma.subscription.findFirst({
      where: { workspaceId, status: "ACTIVE" },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    return c.json({ subscription: sub });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

workspaceBilling.post("/subscription", requireWorkspaceOwner(), requireTokenScope("workspace:write"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;

  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = z.object({ planId: z.string().min(1) }).safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const { planId } = parsed.data;
  const prisma = getPrisma();

  try {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return c.json({ error: "Plan not found" }, 404);

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const sub = await prisma.subscription.create({
      data: { workspaceId, planId, currentPeriodEnd: periodEnd },
      include: { plan: true },
    });
    return c.json(sub, 201);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

workspaceBilling.get("/usage", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), requireTokenScope("workspace:read"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;
  const prisma = getPrisma();

  try {
    const records = await prisma.usageRecord.findMany({
      where: { workspaceId },
      orderBy: { periodStart: "desc" },
      take: 12,
    });
    const total = records.reduce((sum, r) => ({ runsUsed: sum.runsUsed + r.runsUsed, storageBytes: sum.storageBytes + r.storageBytes }), { runsUsed: 0, storageBytes: 0 });
    return c.json({ records, total });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

export { billing, workspaceBilling };
