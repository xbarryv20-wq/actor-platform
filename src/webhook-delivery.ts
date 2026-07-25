import { createHmac } from "node:crypto";

export interface DeliveryResult {
  statusCode: number | null;
  responseBody: string | null;
  errorMessage: string | null;
}

export async function deliverWebhook(
  url: string,
  body: unknown,
  secret?: string | null,
): Promise<DeliveryResult> {
  const payload = JSON.stringify(body);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": "actor-platform-webhook/1.0",
  };

  if (secret) {
    const signature = createHmac("sha256", secret).update(payload).digest("hex");
    headers["x-webhook-signature"] = signature;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: payload,
      signal: AbortSignal.timeout(10_000),
    });

    let responseBody: string | null = null;
    try {
      responseBody = await response.text();
    } catch {
      // ignore body read errors
    }

    return {
      statusCode: response.status,
      responseBody,
      errorMessage: response.ok ? null : `HTTP ${String(response.status)}`,
    };
  } catch (err) {
    return {
      statusCode: null,
      responseBody: null,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}
