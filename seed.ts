import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create default user
  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { id: "user-1", email: "admin@example.com", name: "Admin User" },
  });
  console.log("User:", user.id);

  // Create default organization
  const org = await prisma.organization.upsert({
    where: { slug: "default-org" },
    update: {},
    create: { id: "org-1", name: "Default Org", slug: "default-org" },
  });
  console.log("Organization:", org.id);

  // Create default workspace
  const ws = await prisma.workspace.upsert({
    where: { id: "ws-1" },
    update: {},
    create: { id: "ws-1", organizationId: org.id, name: "Default Workspace", slug: "default-workspace" },
  });
  console.log("Workspace:", ws.id);

  // Create workspace membership
  await prisma.workspaceMembership.upsert({
    where: { userId_workspaceId: { userId: user.id, workspaceId: ws.id } },
    update: {},
    create: { userId: user.id, workspaceId: ws.id, role: "OWNER" },
  });
  console.log("Membership created");

  // Create API token with all scopes
  const rawToken = `tok_${createHash("sha256").update(`${user.id}_${Date.now()}`).digest("hex").slice(0, 24)}`;
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
    create: { userId: user.id, label: "seed-token", tokenHash, scopes: allScopes },
  });
  console.log("API Token created");
  console.log("");
  console.log("=== SAVE THIS TOKEN ===");
  console.log(rawToken);
  console.log("=======================");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
