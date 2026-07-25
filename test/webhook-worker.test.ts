import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  processRetryAttempts,
  RETRY_WORKER_BATCH_SIZE,
  STALE_DELIVERING_GRACE_MS,
} from "../src/webhook-worker.js";

const mockFindMany = vi.fn();
const mockUpdateMany = vi.fn();
const mockUpdate = vi.fn();
const mockFindUnique = vi.fn();
const mockDeliverWebhook = vi.fn();

vi.mock("../src/config.js", () => ({
  getPrisma: vi.fn(() => ({
    webhookAttempt: {
      findMany: mockFindMany,
      updateMany: mockUpdateMany,
      update: mockUpdate,
    },
    webhook: {
      findUnique: mockFindUnique,
    },
  })),
}));

vi.mock("../src/webhook-delivery.js", () => ({
  deliverWebhook: (...args: unknown[]) => mockDeliverWebhook(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function dueAttempt(overrides: Record<string, unknown> = {}) {
  return {
    id: "attempt-1",
    webhookId: "wh-1",
    eventType: "run.succeeded",
    status: "RETRYING",
    attemptCount: 1,
    requestUrl: "https://example.com/hook",
    requestBody: JSON.stringify({ event: "run.succeeded", data: { id: "run-1" } }),
    responseStatusCode: null,
    responseBody: null,
    errorMessage: "HTTP 500",
    nextRetryAt: new Date(Date.now() - 1000),
    lastRetryAt: new Date(Date.now() - 60000),
    createdAt: new Date(Date.now() - 120000),
    completedAt: null,
    ...overrides,
  };
}

function staleDeliveringAttempt(overrides: Record<string, unknown> = {}) {
  return {
    id: "attempt-stale",
    webhookId: "wh-1",
    eventType: "run.succeeded",
    status: "DELIVERING",
    attemptCount: 1,
    requestUrl: "https://example.com/hook",
    requestBody: JSON.stringify({ event: "run.succeeded", data: { id: "run-1" } }),
    responseStatusCode: null,
    responseBody: null,
    errorMessage: null,
    nextRetryAt: null,
    lastRetryAt: new Date(Date.now() - 60000),
    createdAt: new Date(Date.now() - STALE_DELIVERING_GRACE_MS - 1000),
    completedAt: null,
    ...overrides,
  };
}

function freshDeliveringAttempt(overrides: Record<string, unknown> = {}) {
  return staleDeliveringAttempt({
    id: "attempt-fresh",
    createdAt: new Date(Date.now() - 5000),
    ...overrides,
  });
}

describe("processRetryAttempts", () => {
  it("selects due RETRYING and stale DELIVERING attempts", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await processRetryAttempts();

    expect(result.processed).toBe(0);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ status: "RETRYING" }),
            expect.objectContaining({ status: "DELIVERING" }),
          ]),
        }),
        take: RETRY_WORKER_BATCH_SIZE,
        orderBy: { createdAt: "asc" },
      }),
    );
  });

  it("processes due RETRYING attempts", async () => {
    mockFindMany.mockResolvedValue([dueAttempt()]);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindUnique.mockResolvedValue({ url: "https://example.com/hook", secret: null });
    mockDeliverWebhook.mockResolvedValue({ statusCode: 200, responseBody: "ok", errorMessage: null });

    const result = await processRetryAttempts();

    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: "attempt-1", status: "RETRYING" },
      data: { status: "DELIVERING" },
    });
  });

  it("processes stale DELIVERING attempts", async () => {
    mockFindMany.mockResolvedValue([staleDeliveringAttempt()]);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindUnique.mockResolvedValue({ url: "https://example.com/hook", secret: null });
    mockDeliverWebhook.mockResolvedValue({ statusCode: 200, responseBody: "ok", errorMessage: null });

    const result = await processRetryAttempts();

    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(mockUpdateMany).toHaveBeenNthCalledWith(1, {
      where: { id: "attempt-stale", status: "DELIVERING" },
      data: { status: "RETRYING" },
    });
    expect(mockUpdateMany).toHaveBeenNthCalledWith(2, {
      where: { id: "attempt-stale", status: "RETRYING" },
      data: { status: "DELIVERING" },
    });
  });

  it("filters DELIVERING attempts by stale threshold in query", async () => {
    mockFindMany.mockResolvedValue([]);

    await processRetryAttempts();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ status: "RETRYING" }),
            { status: "DELIVERING", createdAt: { lt: expect.any(Date) } },
          ]),
        }),
      }),
    );
  });

  it("skips non-due attempts (no RETRYING or stale DELIVERING)", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await processRetryAttempts();

    expect(result.processed).toBe(0);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.retried).toBe(0);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it("skips claims already taken by another worker", async () => {
    mockFindMany.mockResolvedValue([dueAttempt()]);
    mockUpdateMany.mockResolvedValue({ count: 0 });

    const result = await processRetryAttempts();

    expect(result.processed).toBe(0);
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockDeliverWebhook).not.toHaveBeenCalled();
  });

  it("skips stale claim already taken by another worker", async () => {
    mockFindMany.mockResolvedValue([staleDeliveringAttempt()]);
    mockUpdateMany.mockResolvedValue({ count: 0 });

    const result = await processRetryAttempts();

    expect(result.processed).toBe(0);
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockDeliverWebhook).not.toHaveBeenCalled();
  });

  it("marks retry as SUCCEEDED with complete metadata", async () => {
    mockFindMany.mockResolvedValue([dueAttempt()]);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindUnique.mockResolvedValue({ url: "https://example.com/hook", secret: "sec" });
    mockDeliverWebhook.mockResolvedValue({ statusCode: 200, responseBody: "ok", errorMessage: null });

    const result = await processRetryAttempts();

    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "attempt-1" },
      data: {
        status: "SUCCEEDED",
        attemptCount: 2,
        responseStatusCode: 200,
        responseBody: "ok",
        errorMessage: null,
        lastRetryAt: expect.any(Date),
        completedAt: expect.any(Date),
      },
    });
  });

  it("schedules retry on retriable failure (429) via finalizeAttempt", async () => {
    mockFindMany.mockResolvedValue([dueAttempt()]);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindUnique.mockResolvedValue({ url: "https://example.com/hook", secret: null });
    mockDeliverWebhook.mockResolvedValue({ statusCode: 429, responseBody: null, errorMessage: "HTTP 429" });

    const result = await processRetryAttempts();

    expect(result.processed).toBe(1);
    expect(result.retried).toBe(1);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "attempt-1" },
      data: expect.objectContaining({ status: "RETRYING", attemptCount: 2 }),
    });
  });

  it("marks as FAILED on non-retriable error (400)", async () => {
    mockFindMany.mockResolvedValue([dueAttempt()]);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindUnique.mockResolvedValue({ url: "https://example.com/hook", secret: null });
    mockDeliverWebhook.mockResolvedValue({ statusCode: 400, responseBody: null, errorMessage: "HTTP 400" });

    const result = await processRetryAttempts();

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "attempt-1" },
      data: expect.objectContaining({ status: "FAILED", attemptCount: 2 }),
    });
  });

  it("marks as FAILED when webhook was deleted", async () => {
    mockFindMany.mockResolvedValue([dueAttempt()]);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindUnique.mockResolvedValue(null);

    const result = await processRetryAttempts();

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "attempt-1" },
      data: expect.objectContaining({
        status: "FAILED",
        errorMessage: "Webhook deleted",
      }),
    });
  });

  it("ran out of retry budget", async () => {
    mockFindMany.mockResolvedValue([dueAttempt({ attemptCount: 4 })]);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindUnique.mockResolvedValue({ url: "https://example.com/hook", secret: null });
    mockDeliverWebhook.mockResolvedValue({ statusCode: 503, responseBody: null, errorMessage: "HTTP 503" });

    const result = await processRetryAttempts();

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.retried).toBe(0);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "attempt-1" },
      data: expect.objectContaining({ status: "FAILED", attemptCount: 5 }),
    });
  });

  it("processes multiple attempts in batch", async () => {
    const attempts = [
      dueAttempt({ id: "attempt-1", webhookId: "wh-1" }),
      staleDeliveringAttempt({ id: "attempt-2", webhookId: "wh-2" }),
    ];
    mockFindMany.mockResolvedValue(attempts);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindUnique
      .mockResolvedValueOnce({ url: "https://example.com/1", secret: null })
      .mockResolvedValueOnce({ url: "https://example.com/2", secret: null });
    mockDeliverWebhook
      .mockResolvedValueOnce({ statusCode: 200, responseBody: "ok", errorMessage: null })
      .mockResolvedValueOnce({ statusCode: 200, responseBody: "ok", errorMessage: null });

    const result = await processRetryAttempts();

    expect(result.processed).toBe(2);
    expect(result.succeeded).toBe(2);
    expect(mockUpdateMany).toHaveBeenCalledTimes(3);
    expect(mockDeliverWebhook).toHaveBeenCalledTimes(2);
  });

  it("respects custom batch size", async () => {
    mockFindMany.mockResolvedValue([]);

    await processRetryAttempts({ batchSize: 3 });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 }),
    );
  });
});
