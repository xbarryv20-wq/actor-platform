import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ─── User & Org ────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { id: "user-1", email: "admin@example.com", name: "Admin User" },
  });

  const org = await prisma.organization.upsert({
    where: { slug: "default-org" },
    update: {},
    create: { id: "org-1", name: "Default Org", slug: "default-org" },
  });

  const ws = await prisma.workspace.upsert({
    where: { id: "ws-1" },
    update: {},
    create: { id: "ws-1", organizationId: org.id, name: "Default Workspace", slug: "default-workspace" },
  });

  await prisma.workspaceMembership.upsert({
    where: { userId_workspaceId: { userId: user.id, workspaceId: ws.id } },
    update: {},
    create: { userId: user.id, workspaceId: ws.id, role: "OWNER" },
  });

  // ─── API Token ────────────────────────────────────────────
  const rawToken = `tok_${createHash("sha256").update(`seed_${Date.now()}`).digest("hex").slice(0, 24)}`;
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const allScopes = [
    "actors:read", "actors:write", "runs:read", "runs:write",
    "storage:read", "storage:write", "webhooks:read", "webhooks:write",
    "tokens:read", "tokens:write", "workspace:read", "workspace:write",
    "schedules:read", "schedules:write",
  ].join(",");

  await prisma.apiToken.upsert({
    where: { tokenHash },
    update: {},
    create: { userId: user.id, label: "console-token", tokenHash, scopes: allScopes },
  });

  // ─── Actors ───────────────────────────────────────────────
  const actors = [
    { id: "act-1", slug: "web-scraper", name: "Web Scraper", description: "Scrapes product pages and extracts pricing data from e-commerce sites.", tags: ["web-scraping", "data-extraction"], status: "PUBLISHED" as const },
    { id: "act-2", slug: "price-monitor", name: "Price Monitor", description: "Monitors product prices across multiple retailers and alerts on changes.", tags: ["monitoring", "pricing", "alerts"], status: "PUBLISHED" as const },
    { id: "act-3", slug: "review-analyzer", name: "Review Analyzer", description: "Extracts and analyzes product reviews from marketplaces.", tags: ["text-analysis", "reviews"], status: "PUBLISHED" as const },
    { id: "act-4", slug: "seo-crawler", name: "SEO Crawler", description: "Crawls websites to analyze SEO metrics, meta tags, and page structure.", tags: ["seo", "crawling"], status: "DRAFT" as const },
    { id: "act-5", slug: "data-enricher", name: "Data Enricher", description: "Enriches existing datasets with additional information from web sources.", tags: ["data-enrichment", "web"], status: "PUBLISHED" as const },
  ];

  for (const a of actors) {
    await prisma.actor.upsert({
      where: { id: a.id },
      update: {},
      create: { id: a.id, workspaceId: ws.id, ownerId: user.id, ...a },
    });
  }

  // ─── Actor Versions ────────────────────────────────────────
  const versions = [
    { id: "ver-1", actorId: "act-1", version: 1, changelog: "Initial release with basic scraping" },
    { id: "ver-2", actorId: "act-2", version: 1, changelog: "Initial price monitoring with alerts" },
    { id: "ver-3", actorId: "act-3", version: 1, changelog: "Initial review analysis" },
    { id: "ver-5", actorId: "act-5", version: 1, changelog: "Initial data enrichment" },
  ];

  for (const v of versions) {
    await prisma.actorVersion.upsert({
      where: { actorId_version: { actorId: v.actorId, version: v.version } },
      update: {},
      create: v,
    });
  }

  // ─── Schedules ────────────────────────────────────────────
  await prisma.schedule.create({
    data: { id: "sch-1", workspaceId: ws.id, actorId: "act-1", cronExpression: "0 */6 * * *", enabled: true },
  });
  await prisma.schedule.create({
    data: { id: "sch-2", workspaceId: ws.id, actorId: "act-2", cronExpression: "0 * * * *", enabled: true },
  });

  // ─── Webhooks ──────────────────────────────────────────────
  await prisma.webhook.create({
    data: { id: "wh-1", workspaceId: ws.id, actorId: "act-1", eventTypes: "run.succeeded,run.failed", url: "https://example.com/hooks/run-status", ownerId: user.id, enabled: true },
  });

  // ─── Billing Plans ─────────────────────────────────────────
  await prisma.plan.upsert({
    where: { id: "plan-free" },
    update: {},
    create: { id: "plan-free", name: "Free", description: "Basic plan with limited runs", priceCents: 0, runLimit: 100, storageMb: 100, interval: "monthly" },
  });
  await prisma.plan.upsert({
    where: { id: "plan-pro" },
    update: {},
    create: { id: "plan-pro", name: "Pro", description: "Unlimited runs and storage", priceCents: 2900, runLimit: 10000, storageMb: 1000, interval: "monthly" },
  });

  console.log("Seeding complete!");
  console.log("");
  console.log("=== LOGIN TOKEN ===");
  console.log(rawToken);
  console.log("===================");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
