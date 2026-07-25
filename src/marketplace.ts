import { Hono, Context } from "hono";
import { z } from "zod";
import { getPrisma } from "./config.js";
import { requireWorkspaceRole, getWorkspaceRole } from "./workspace-auth.js";
import { requireTokenScope } from "./token-scope.js";
import { requireAuth } from "./auth.js";
import { emitEvent } from "./events.js";
import { triggerWebhooks } from "./webhook-trigger.js";

function getMarketplaceId(c: Context): string | Response {
  const id = c.req.param("marketplaceId");
  if (!id) return c.json({ error: "Missing marketplaceId in URL" }, 400);
  return id;
}

function getWorkspaceId(c: Context): string | Response {
  const id = c.req.param("workspaceId");
  if (!id) return c.json({ error: "Missing workspaceId in URL" }, 400);
  return id;
}

function getUserId(c: Context): string {
  return c.get("userId" as never) as string;
}

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  category: z.string().optional(),
});

const publishSchema = z.object({
  actorId: z.string().min(1, "actorId is required"),
  category: z.string().optional(),
});

const marketplace = new Hono();

async function assertMarketplaceWorkspaceAccess(c: Context, marketplaceId: string): Promise<{ listing?: { id: string; status: string; publisherId: string; workspaceId: string; actorId: string }; error?: Response }> {
  const prisma = getPrisma();
  const listing = await prisma.marketplaceListing.findUnique({
    where: { id: marketplaceId },
    select: { id: true, status: true, publisherId: true, actor: { select: { id: true, workspaceId: true } } },
  });
  if (!listing) return { error: c.json({ error: "Listing not found" }, 404) };
  const role = await getWorkspaceRole(getUserId(c), listing.actor.workspaceId);
  if (!role) return { error: c.json({ error: "Forbidden: not a member of this workspace" }, 403) };
  return { listing: { id: listing.id, status: listing.status, publisherId: listing.publisherId, workspaceId: listing.actor.workspaceId, actorId: listing.actor.id } };
}

marketplace.get("/", async (c) => {
  const rawQuery = {
    limit: c.req.query("limit"),
    cursor: c.req.query("cursor"),
    category: c.req.query("category"),
  };

  const parsed = listQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return c.json({ error: "Invalid query parameters", details: parsed.error.flatten() }, 400);
  }

  const { limit, cursor, category } = parsed.data;
  const prisma = getPrisma();

  try {
    const where: Record<string, unknown> = { status: "APPROVED" };
    if (category) where.category = category;

    const items = await prisma.marketplaceListing.findMany({
      where: where as never,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        actor: {
          select: { id: true, name: true, slug: true, description: true, tags: true, icon: true, inputSchema: true },
        },
      },
    });

    const hasMore = items.length > limit;
    const listings = hasMore ? items.slice(0, limit) : items;
    let nextCursor: string | undefined;
    if (hasMore) {
      const last = listings.at(-1);
      if (last) nextCursor = last.id;
    }

    return c.json({ listings, ...(nextCursor ? { nextCursor } : {}) });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

marketplace.get("/:marketplaceId", async (c) => {
  const maybeId = getMarketplaceId(c);
  if (maybeId instanceof Response) return maybeId;
  const marketplaceId: string = maybeId;
  const prisma = getPrisma();

  try {
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: marketplaceId },
      include: {
        actor: {
          select: { id: true, name: true, slug: true, description: true, tags: true, icon: true, status: true, inputSchema: true, createdAt: true, updatedAt: true },
        },
      },
    });

    if (!listing || listing.status === "UNPUBLISHED") {
      return c.json({ error: "Listing not found" }, 404);
    }

    return c.json(listing);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

marketplace.post("/:marketplaceId/unpublish", requireAuth, requireTokenScope("actors:write"), async (c) => {
  const maybeId = getMarketplaceId(c);
  if (maybeId instanceof Response) return maybeId;
  const marketplaceId: string = maybeId;
  const userId = getUserId(c);
  const prisma = getPrisma();

  try {
    const access = await assertMarketplaceWorkspaceAccess(c, marketplaceId);
    if (access.error) return access.error;
    const listing = access.listing;
    if (!listing) return c.json({ error: "Listing not found" }, 404);

    if (listing.publisherId !== userId) {
      return c.json({ error: "Forbidden: insufficient permissions" }, 403);
    }

    await prisma.marketplaceListing.update({
      where: { id: marketplaceId },
      data: { status: "UNPUBLISHED" },
    });

    void triggerWebhooks({
      eventType: "marketplace.unpublished",
      workspaceId: listing.workspaceId,
      actorId: listing.actorId,
      payload: { listingId: marketplaceId, status: "UNPUBLISHED" },
    });

    void emitEvent(prisma, {
      workspaceId: listing.workspaceId,
      actorId: listing.actorId,
      type: "MARKETPLACE_UNPUBLISHED",
      message: `Marketplace listing ${marketplaceId.substring(0, 12)} unpublished`,
      payload: { listingId: marketplaceId },
    });

    return c.json({ success: true });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

marketplace.post("/:marketplaceId/approve", requireAuth, requireTokenScope("actors:write"), async (c) => {
  const maybeId = getMarketplaceId(c);
  if (maybeId instanceof Response) return maybeId;
  const marketplaceId: string = maybeId;
  const prisma = getPrisma();

  try {
    const access = await assertMarketplaceWorkspaceAccess(c, marketplaceId);
    if (access.error) return access.error;
    const listing = access.listing;
    if (!listing) return c.json({ error: "Listing not found" }, 404);

    if (listing.status !== "PENDING") {
      return c.json({ error: "Only PENDING listings can be approved" }, 400);
    }

    await prisma.marketplaceListing.update({
      where: { id: marketplaceId },
      data: { status: "APPROVED" },
    });

    void triggerWebhooks({
      eventType: "marketplace.approved",
      workspaceId: listing.workspaceId,
      actorId: listing.actorId,
      payload: { listingId: marketplaceId, status: "APPROVED" },
    });

    void emitEvent(prisma, {
      workspaceId: listing.workspaceId,
      actorId: listing.actorId,
      type: "MARKETPLACE_APPROVED",
      message: `Marketplace listing ${marketplaceId.substring(0, 12)} approved`,
      payload: { listingId: marketplaceId },
    });

    return c.json({ success: true });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

marketplace.post("/:marketplaceId/reject", requireAuth, requireTokenScope("actors:write"), async (c) => {
  const maybeId = getMarketplaceId(c);
  if (maybeId instanceof Response) return maybeId;
  const marketplaceId: string = maybeId;
  const prisma = getPrisma();

  try {
    const access = await assertMarketplaceWorkspaceAccess(c, marketplaceId);
    if (access.error) return access.error;
    const listing = access.listing;
    if (!listing) return c.json({ error: "Listing not found" }, 404);

    if (listing.status !== "PENDING") {
      return c.json({ error: "Only PENDING listings can be rejected" }, 400);
    }

    await prisma.marketplaceListing.update({
      where: { id: marketplaceId },
      data: { status: "REJECTED" },
    });

    void triggerWebhooks({
      eventType: "marketplace.rejected",
      workspaceId: listing.workspaceId,
      actorId: listing.actorId,
      payload: { listingId: marketplaceId, status: "REJECTED" },
    });

    void emitEvent(prisma, {
      workspaceId: listing.workspaceId,
      actorId: listing.actorId,
      type: "MARKETPLACE_REJECTED",
      message: `Marketplace listing ${marketplaceId.substring(0, 12)} rejected`,
      payload: { listingId: marketplaceId },
    });

    return c.json({ success: true });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

const workspaceMarketplace = new Hono();

workspaceMarketplace.post("/", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), requireTokenScope("actors:write"), async (c) => {
  const maybeWsId = getWorkspaceId(c);
  if (maybeWsId instanceof Response) return maybeWsId;
  const workspaceId: string = maybeWsId;

  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = publishSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const { actorId, category } = parsed.data;
  const userId = getUserId(c);
  const prisma = getPrisma();

  try {
    const actor = await prisma.actor.findUnique({
      where: { id: actorId },
      select: { id: true, workspaceId: true, status: true, ownerId: true },
    });

    if (actor?.workspaceId !== workspaceId) {
      return c.json({ error: "Actor not found" }, 404);
    }

    if (actor.status !== "PUBLISHED") {
      return c.json({ error: "Only PUBLISHED actors can be listed in the marketplace" }, 400);
    }

    const listing = await prisma.marketplaceListing.create({
      data: { actorId, publisherId: userId, category, status: "PENDING" },
      include: {
        actor: {
          select: { id: true, name: true, slug: true, description: true, tags: true, icon: true },
        },
      },
    });

    void triggerWebhooks({
      eventType: "marketplace.listed",
      workspaceId,
      actorId,
      payload: { listingId: listing.id, name: listing.actor.name, slug: listing.actor.slug, status: "PENDING" },
    });

    void emitEvent(prisma, {
      workspaceId,
      actorId,
      type: "MARKETPLACE_LISTED",
      message: `Actor ${listing.actor.name} listed in marketplace`,
      payload: { listingId: listing.id, name: listing.actor.name, slug: listing.actor.slug, category },
    });

    return c.json(listing, 201);
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

export { marketplace, workspaceMarketplace };
