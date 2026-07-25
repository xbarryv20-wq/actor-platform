import type { DeliveryResult } from "./webhook-delivery.js";

export const MAX_RETRY_ATTEMPTS = 5;
export const RETRY_BASE_DELAY_MS = 60_000;
export const RETRY_MAX_DELAY_MS = 3_600_000;

export function isRetriable(result: DeliveryResult): boolean {
  if (result.statusCode === null) {
    return true;
  }
  if (result.statusCode === 429) {
    return true;
  }
  if (result.statusCode >= 500) {
    return true;
  }
  return false;
}

export function calculateNextRetry(
  attemptCount: number,
): { delayMs: number; nextRetryAt: Date } | null {
  if (attemptCount >= MAX_RETRY_ATTEMPTS) {
    return null;
  }

  const exponent = attemptCount - 1;
  const baseDelay = RETRY_BASE_DELAY_MS * Math.pow(2, exponent);
  const clampedDelay = Math.min(baseDelay, RETRY_MAX_DELAY_MS);

  const jitterRange = clampedDelay * 0.25;
  const jitter = (Math.random() * jitterRange * 2) - jitterRange;
  const delayMs = Math.round(clampedDelay + jitter);

  return {
    delayMs,
    nextRetryAt: new Date(Date.now() + delayMs),
  };
}
