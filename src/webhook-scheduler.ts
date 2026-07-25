import { processRetryAttempts } from "./webhook-worker.js";

export const DEFAULT_RETRY_INTERVAL_MS = 5_000;

export interface RetryScheduler {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
}

export function createWebhookRetryScheduler(
  options?: { intervalMs?: number },
): RetryScheduler {
  const intervalMs = options?.intervalMs ?? DEFAULT_RETRY_INTERVAL_MS;
  let timer: ReturnType<typeof setInterval> | null = null;

  async function tick(): Promise<void> {
    try {
      const result = await processRetryAttempts();
      if (result.processed > 0) {
        console.log(
          `[webhook-scheduler] Processed ${String(result.processed)} attempts ` +
          `(${String(result.succeeded)} succeeded, ${String(result.failed)} failed, ${String(result.retried)} retried)`,
        );
      }
    } catch (err) {
      console.error("[webhook-scheduler] Tick failed:", err);
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
