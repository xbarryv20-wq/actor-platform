import { serve } from "@hono/node-server";
import { Hono } from "hono";
import type { Env } from "hono";
import { config, checkDb } from "./config.js";
import { runs, listWorkspaceRuns } from "./runs.js";
import { schedules, listWorkspaceSchedules } from "./schedules.js";
import { requireAuth } from "./auth.js";
import { requireTokenScope } from "./token-scope.js";
import { workspaces } from "./workspaces.js";
import { actors } from "./actors.js";
import { apiTokens } from "./api-tokens.js";
import { datasets } from "./datasets.js";
import { kvStores } from "./kv-stores.js";
import { requestQueues } from "./request-queues.js";
import { webhooks } from "./webhooks.js";
import { marketplace, workspaceMarketplace } from "./marketplace.js";
import { billing, workspaceBilling } from "./billing.js";
import { admin } from "./admin.js";
import { consoleRoute } from "./console.js";
import { events } from "./events-route.js";
import { handleError } from "./errors.js";
import { createWebhookRetryScheduler } from "./webhook-scheduler.js";
import { createRunWorkerScheduler } from "./run-worker.js";
import { createScheduleScheduler } from "./schedule-scheduler.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  db: { status: string; error?: string };
}

const app = new Hono<Env>();

app.onError((err, c) => handleError(err, c));

app.get("/", (c) => c.redirect("/console"));

app.route("/console", consoleRoute);

const openapiSpec = JSON.parse(readFileSync(join(__dirname, "../project-docs/openapi.json"), "utf-8")) as Record<string, unknown>;

app.get("/openapi.json", (c) => c.json(openapiSpec));

app.get("/docs", (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Actor Platform API Docs</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
SwaggerUIBundle({ url: "/openapi.json", dom_id: "#swagger-ui" });
</script>
</body>
</html>`);
});

app.get("/health", async (c) => {
  const db = await checkDb();
  const body: HealthResponse = {
    status: "ok",
    service: config.serviceName,
    version: config.version,
    timestamp: new Date().toISOString(),
    db: {
      status: db.ok ? "connected" : "disconnected",
      ...(db.error ? { error: db.error } : {}),
    },
  };
  return c.json(body);
});

app.route("/marketplace", marketplace);
app.route("/billing", billing);
app.route("/admin", admin);

app.use("/runs/*", requireAuth);
app.use("/workspaces/*", requireAuth);
app.use("/schedules/*", requireAuth);

app.route("/runs", runs);
app.get("/workspaces/:workspaceId/runs", requireTokenScope("runs:read"), listWorkspaceRuns);
app.route("/schedules", schedules);
app.get("/workspaces/:workspaceId/schedules", requireTokenScope("schedules:read"), listWorkspaceSchedules);

app.route("/workspaces/:workspaceId", workspaces);
app.route("/workspaces/:workspaceId/actors", actors);
app.route("/workspaces/:workspaceId/api-tokens", apiTokens);
app.route("/workspaces/:workspaceId/datasets", datasets);
app.route("/workspaces/:workspaceId/kv-stores", kvStores);
app.route("/workspaces/:workspaceId/request-queues", requestQueues);
app.route("/workspaces/:workspaceId/webhooks", webhooks);
app.route("/workspaces/:workspaceId/marketplace", workspaceMarketplace);
app.route("/workspaces/:workspaceId/events", events);
app.route("/workspaces/:workspaceId/billing", workspaceBilling);

if (!process.env.VITEST && !process.env.VERCEL) {
  const server = serve({ fetch: app.fetch, port: config.port });
  const webhookScheduler = createWebhookRetryScheduler();
  webhookScheduler.start();
  const runWorkerScheduler = createRunWorkerScheduler();
  runWorkerScheduler.start();
  const scheduleScheduler = createScheduleScheduler();
  scheduleScheduler.start();

  process.on("SIGTERM", () => {
    webhookScheduler.stop();
    runWorkerScheduler.stop();
    scheduleScheduler.stop();
    server.close();
  });

  process.on("SIGINT", () => {
    webhookScheduler.stop();
    runWorkerScheduler.stop();
    scheduleScheduler.stop();
    server.close();
  });
}

export default app;
export { app };
