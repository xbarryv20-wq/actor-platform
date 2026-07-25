import { getPrisma } from "./config.js";
import { claimAndExecuteRun } from "./run-executor.js";

export const RUN_WORKER_BATCH_SIZE = 5;
export const DEFAULT_RUN_WORKER_INTERVAL_MS = 5_000;

export interface RunWorkerResult {
  processed: number;
  succeeded: number;
  failed: number;
}

export async function processPendingRuns(
  options?: { batchSize?: number },
): Promise<RunWorkerResult> {
  const prisma = getPrisma();
  const batchSize = options?.batchSize ?? RUN_WORKER_BATCH_SIZE;

  const pending = await prisma.actorRun.findMany({
    where: { status: "PENDING" },
    take: batchSize,
    orderBy: { createdAt: "asc" },
  });

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const run of pending) {
    const result = await claimAndExecuteRun(run.id);
    processed++;
    if (result.succeeded) {
      succeeded++;
    } else {
      failed++;
    }
  }

  return { processed, succeeded, failed };
}

export interface RunWorkerScheduler {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
}

export function createRunWorkerScheduler(
  options?: { intervalMs?: number },
): RunWorkerScheduler {
  const intervalMs = options?.intervalMs ?? DEFAULT_RUN_WORKER_INTERVAL_MS;
  let timer: ReturnType<typeof setInterval> | null = null;

  async function tick(): Promise<void> {
    try {
      const result = await processPendingRuns();
      if (result.processed > 0) {
        console.log(
          `[run-worker] Processed ${String(result.processed)} runs ` +
          `(${String(result.succeeded)} succeeded, ${String(result.failed)} failed)`,
        );
      }
    } catch (err) {
      console.error("[run-worker] Tick failed:", err);
    }
  }

  return {
    start(): void {
      if (timer !== null) return;
      void tick();
      timer = setInterval(() => { void tick(); }, intervalMs);
    },

    stop(): void {
      if (timer === null) return;
      clearInterval(timer);
      timer = null;
    },

    isRunning(): boolean {
      return timer !== null;
    },
  };
}
