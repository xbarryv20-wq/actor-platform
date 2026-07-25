import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "./config.js";
import { deliverWebhook } from "./webhook-delivery.js";
import type { DeliveryResult } from "./webhook-delivery.js";
import { isRetriable, calculateNextRetry } from "./webhook-retry.js";

export interface WebhookEvent {
  eventType: string;
  workspaceId: string;
  actorId: string;
  payload: Record<string, unknown>;
}

export async function finalizeAttempt(
  prisma: PrismaClient,
  attemptId: string,
  attemptCount: number,
  result: DeliveryResult,
): Promise<{ retryScheduled: boolean }> {
  if (result.errorMessage === null) {
    await prisma.webhookAttempt.update({
      where: { id: attemptId },
      data: {
        status: "SUCCEEDED",
        attemptCount,
        responseStatusCode: result.statusCode,
        responseBody: result.responseBody,
        errorMessage: null,
        lastRetryAt: new Date(),
        completedAt: new Date(),
      },
    });
    return { retryScheduled: false };
  }

  const retriable = isRetriable(result);
  const schedule = retriable ? calculateNextRetry(attemptCount) : null;

  if (schedule) {
    await prisma.webhookAttempt.update({
      where: { id: attemptId },
      data: {
        status: "RETRYING",
        attemptCount,
        responseStatusCode: result.statusCode,
        responseBody: result.responseBody,
        errorMessage: result.errorMessage,
        lastRetryAt: new Date(),
        nextRetryAt: schedule.nextRetryAt,
      },
    });
    return { retryScheduled: true };
  }

  await prisma.webhookAttempt.update({
    where: { id: attemptId },
    data: {
      status: "FAILED",
      attemptCount,
      responseStatusCode: result.statusCode,
      responseBody: result.responseBody,
      errorMessage: result.errorMessage,
      lastRetryAt: new Date(),
      completedAt: new Date(),
    },
  });
  return { retryScheduled: false };
}

export async function triggerWebhooks(event: WebhookEvent): Promise<{ triggered: number; queuedForRetry: number }> {
  if (process.env.VITEST) {
    return { triggered: 0, queuedForRetry: 0 };
  }

  const prisma = getPrisma();

  const webhooks = await prisma.webhook.findMany({
    where: {
      workspaceId: event.workspaceId,
      actorId: event.actorId,
      enabled: true,
    },
    select: { id: true, url: true, secret: true, eventTypes: true },
  });

  const matched = webhooks.filter((w) => {
    const types = w.eventTypes.split(",").map((t) => t.trim());
    return types.includes(event.eventType);
  });

  if (matched.length === 0) {
    return { triggered: 0, queuedForRetry: 0 };
  }

  let queuedForRetry = 0;

  for (const webhook of matched) {
    const attempt = await prisma.webhookAttempt.create({
      data: {
        webhookId: webhook.id,
        eventType: event.eventType,
        status: "PENDING",
        attemptCount: 1,
        requestUrl: webhook.url,
        requestBody: JSON.stringify(event.payload),
      },
      select: { id: true },
    });

    await prisma.webhookAttempt.update({
      where: { id: attempt.id },
      data: { status: "DELIVERING" },
    });

    const result = await deliverWebhook(webhook.url, event.payload, webhook.secret);
    const outcome = await finalizeAttempt(prisma, attempt.id, 1, result);

    if (outcome.retryScheduled) {
      queuedForRetry++;
    }
  }

  return { triggered: matched.length, queuedForRetry };
}
