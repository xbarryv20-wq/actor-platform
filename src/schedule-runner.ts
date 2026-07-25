import type { PrismaClient } from "@prisma/client";
import { CronExpressionParser } from "cron-parser";
import { getPrisma } from "./config.js";
import { triggerWebhooks } from "./webhook-trigger.js";
import { emitEvent } from "./events.js";

export const SCHEDULE_RUNNER_BATCH_SIZE = 10;

export const SCHEDULE_CLAIM_SENTINEL = new Date(0);

export const STALE_SCHEDULE_GRACE_MS = 30_000;

export interface ScheduleRunnerResult {
  processed: number;
  runsCreated: number;
  errors: number;
}

export function computeNextRun(
  cronExpression: string,
  after: Date = new Date(),
): Date | null {
  try {
    const interval = CronExpressionParser.parse(cronExpression, {
      currentDate: after,
      tz: "Etc/UTC",
    });
    const next = interval.next();
    return next.toDate();
  } catch {
    return null;
  }
}

export async function recoverStaleSchedules(
  options?: { graceMs?: number; batchSize?: number },
): Promise<number> {
  const prisma = getPrisma();
  const graceMs = options?.graceMs ?? STALE_SCHEDULE_GRACE_MS;
  const batchSize = options?.batchSize ?? SCHEDULE_RUNNER_BATCH_SIZE;
  const threshold = new Date(Date.now() - graceMs);

  const stale = await prisma.schedule.findMany({
    where: {
      enabled: true,
      nextRunAt: SCHEDULE_CLAIM_SENTINEL,
      updatedAt: { lte: threshold },
    },
    take: batchSize,
    orderBy: { updatedAt: "asc" },
  });

  let recovered = 0;

  for (const schedule of stale) {
    const { count } = await prisma.schedule.updateMany({
      where: { id: schedule.id, nextRunAt: SCHEDULE_CLAIM_SENTINEL },
      data: { nextRunAt: new Date() },
    });
    if (count > 0) recovered++;
  }

  if (recovered > 0) {
    console.log(
      `[schedule-runner] Recovered ${String(recovered)} stale schedule(s)`,
    );
  }

  return recovered;
}

async function claimSchedule(
  prisma: PrismaClient,
  scheduleId: string,
  expectedNextRunAt: Date,
): Promise<boolean> {
  const { count } = await prisma.schedule.updateMany({
    where: { id: scheduleId, nextRunAt: expectedNextRunAt },
    data: { nextRunAt: SCHEDULE_CLAIM_SENTINEL },
  });
  return count > 0;
}

export async function processDueSchedules(
  options?: { batchSize?: number },
): Promise<ScheduleRunnerResult> {
  const prisma = getPrisma();
  const batchSize = options?.batchSize ?? SCHEDULE_RUNNER_BATCH_SIZE;

  const due = await prisma.schedule.findMany({
    where: {
      enabled: true,
      nextRunAt: { lte: new Date() },
    },
    take: batchSize,
    orderBy: { nextRunAt: "asc" },
  });

  let processed = 0;
  let runsCreated = 0;
  let errors = 0;

  for (const schedule of due) {
    if (!schedule.nextRunAt) continue;

    const claimed = await claimSchedule(prisma, schedule.id, schedule.nextRunAt);
    if (!claimed) continue;

    try {
      const actor = await prisma.actor.findUnique({
        where: { id: schedule.actorId },
        select: { workspaceId: true },
      });

      if (actor?.workspaceId !== schedule.workspaceId) {
        await prisma.schedule.update({
          where: { id: schedule.id },
          data: {
            nextRunAt: null,
            lastRunAt: new Date(),
            enabled: false,
            errorMessage: "Actor not found or workspace mismatch",
          },
        });
        errors++;
        processed++;
        continue;
      }

      const run = await prisma.actorRun.create({
        data: {
          actorId: schedule.actorId,
          workspaceId: schedule.workspaceId,
          actorVersionId: schedule.actorVersionId,
          input: schedule.inputOverride as object | undefined,
          status: "PENDING",
        },
      });

      void triggerWebhooks({
        eventType: "run.created",
        workspaceId: schedule.workspaceId,
        actorId: schedule.actorId,
        payload: { id: run.id, status: run.status, triggeredBy: "schedule" },
      });

      void emitEvent(prisma, {
        workspaceId: schedule.workspaceId,
        actorId: schedule.actorId,
        scheduleId: schedule.id,
        runId: run.id,
        type: "SCHEDULE_DISPATCHED",
        message: `Schedule ${schedule.id.substring(0, 12)} dispatched run`,
        payload: { cronExpression: schedule.cronExpression },
      });

      const newNextRunAt = computeNextRun(schedule.cronExpression, new Date());
      if (newNextRunAt) {
        await prisma.schedule.update({
          where: { id: schedule.id },
          data: { nextRunAt: newNextRunAt, lastRunAt: new Date() },
        });
      } else {
        await prisma.schedule.update({
          where: { id: schedule.id },
          data: { nextRunAt: null, lastRunAt: new Date(), enabled: false },
        });
      }

      runsCreated++;
    } catch {
      await prisma.schedule.update({
        where: { id: schedule.id },
        data: {
          nextRunAt: schedule.nextRunAt,
          errorMessage: "Dispatch failed",
        },
      });
      errors++;
    }

    processed++;
  }

  return { processed, runsCreated, errors };
}
