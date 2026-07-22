import { PrismaClient } from "@prisma/client";

export const config = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL,
  serviceName: "actor-platform",
  version: "0.0.1",
};

let prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  prisma ??= new PrismaClient();
  return prisma;
}

export async function checkDb(): Promise<{ ok: boolean; error?: string }> {
  if (!config.databaseUrl) {
    return { ok: false, error: "DATABASE_URL not configured" };
  }
  try {
    const client = getPrisma();
    await client.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
