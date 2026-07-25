import { processDueSchedules, recoverStaleSchedules } from "./schedule-runner.js";

export const DEFAULT_SCHEDULE_INTERVAL_MS = 10_000;

export interface ScheduleScheduler {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
}

export function createScheduleScheduler(
  options?: { intervalMs?: number },
): ScheduleScheduler {
  const intervalMs = options?.intervalMs ?? DEFAULT_SCHEDULE_INTERVAL_MS;
  let timer: ReturnType<typeof setInterval> | null = null;

  async function tick(): Promise<void> {
    try {
      await recoverStaleSchedules();
      const result = await processDueSchedules();
      if (result.processed > 0) {
        console.log(
          `[schedule-scheduler] Processed ${String(result.processed)} schedules ` +
          `(${String(result.runsCreated)} runs created, ${String(result.errors)} errors)`,
        );
      }
    } catch (err) {
      console.error("[schedule-scheduler] Tick failed:", err);
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
