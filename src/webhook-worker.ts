import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "./config.js";
import { deliverWebhook } from "./webhook-delivery.js";
import { finalizeAttempt } from "./webhook-trigger.js";

export const RETRY_WORKER_BATCH_SIZE = 10;
export const STALE_DELIVERING_GRACE_MS = 30_000;

export interface WorkerResult {
  processed: number;
  succeeded: number;
  failed: number;
  retried: number;
}

function parseBody(raw: string | null): unknown {
  if (raw === null) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function claimAttempt(
  prisma: PrismaClient,
  attemptId: string,
  expectedStatus: "RETRYING" | "DELIVERING",
): Promise<boolean> {
  const { count } = await prisma.webhookAttempt.updateMany({
    where: { id: attemptId, status: expectedStatus },
    data: { status: "DELIVERING" },
  });
  return count > 0;
}

async function handleWebhookDeleted(
  prisma: PrismaClient,
  attemptId: string,
): Promise<void> {
  await prisma.webhookAttempt.update({
    where: { id: attemptId },
    data: {
      status: "FAILED",
      errorMessage: "Webhook deleted",
      lastRetryAt: new Date(),
      completedAt: new Date(),
    },
  });
}

export async function processRetryAttempts(
  options?: { batchSize?: number },
): Promise<WorkerResult> {
  const prisma = getPrisma();
  const batchSize = options?.batchSize ?? RETRY_WORKER_BATCH_SIZE;
  const staleThreshold = new Date(Date.now() - STALE_DELIVERING_GRACE_MS);

  const due = await prisma.webhookAttempt.findMany({
    where: {
      OR: [
        { status: "RETRYING", nextRetryAt: { lte: new Date() } },
        { status: "DELIVERING", createdAt: { lt: staleThreshold } },
      ],
    },
    take: batchSize,
    orderBy: { createdAt: "asc" },
  });

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let retried = 0;

  for (const attempt of due) {
    if (attempt.status === "DELIVERING") {
      const { count } = await prisma.webhookAttempt.updateMany({
        where: { id: attempt.id, status: "DELIVERING" },
        data: { status: "RETRYING" },
      });
      if (count === 0) continue;
    }

    const claimed = await claimAttempt(prisma, attempt.id, "RETRYING");
    if (!claimed) continue;

    const webhook = await prisma.webhook.findUnique({
      where: { id: attempt.webhookId },
      select: { url: true, secret: true },
    });

    if (!webhook) {
      await handleWebhookDeleted(prisma, attempt.id);
      failed++;
      processed++;
      continue;
    }

    const body = parseBody(attempt.requestBody);
    const result = await deliverWebhook(webhook.url, body, webhook.secret);
    const nextAttemptCount = attempt.attemptCount + 1;
    const outcome = await finalizeAttempt(prisma, attempt.id, nextAttemptCount, result);

    processed++;
    if (outcome.retryScheduled) {
      retried++;
    } else if (result.errorMessage === null) {
      succeeded++;
    } else {
      failed++;
    }
  }

  return { processed, succeeded, failed, retried };
}
