import { serve } from "@hono/node-server";
import { Hono } from "hono";
import type { Env } from "hono";
import { config, checkDb } from "./config.js";

interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  db: { status: string; error?: string };
}

const app = new Hono<Env>();

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

if (!process.env.VITEST) {
  serve({ fetch: app.fetch, port: config.port });
}

export default app;
export { app };
