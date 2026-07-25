import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { deliverWebhook } from "../src/webhook-delivery.js";

describe("deliverWebhook", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends POST with correct headers and body", async () => {
    const mockFetch = vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("ok"),
    } as Response);

    const body = { event: "run.succeeded", data: { id: "run-1" } };
    const result = await deliverWebhook("https://example.com/hook", body);

    expect(result.statusCode).toBe(200);
    expect(result.responseBody).toBe("ok");
    expect(result.errorMessage).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/hook",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
        }) as Record<string, unknown>,
        body: JSON.stringify(body),
      }),
    );
  });

  it("signs body with HMAC-SHA256 when secret is provided", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("ok"),
    } as Response);

    const body = { event: "run.succeeded" };
    await deliverWebhook("https://example.com/hook", body, "my-secret");

    const mockCalls = vi.mocked(fetch).mock.calls;
    const args = mockCalls[0] as [string, RequestInit];
    const headers = (args[1].headers ?? {}) as Record<string, string>;
    expect(headers["x-webhook-signature"]).toBeDefined();
    expect(headers["x-webhook-signature"]).toHaveLength(64);
  });

  it("returns error on network failure", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await deliverWebhook("https://example.com/hook", {});

    expect(result.statusCode).toBeNull();
    expect(result.responseBody).toBeNull();
    expect(result.errorMessage).toBe("ECONNREFUSED");
  });

  it("returns error on non-2xx status", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    } as Response);

    const result = await deliverWebhook("https://example.com/hook", {});

    expect(result.statusCode).toBe(500);
    expect(result.errorMessage).toBe("HTTP 500");
  });

  it("handles empty response body", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 204,
      text: () => Promise.resolve(""),
    } as Response);

    const result = await deliverWebhook("https://example.com/hook", {});

    expect(result.statusCode).toBe(204);
    expect(result.responseBody).toBe("");
    expect(result.errorMessage).toBeNull();
  });
});
