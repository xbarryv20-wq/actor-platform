import { Context } from "hono";

export interface ErrorResponse {
  error: string;
  details?: unknown;
}

export function errorResponse(c: Context, status: number, message: string, details?: unknown): Response {
  const body: ErrorResponse = { error: message };
  if (details !== undefined) body.details = details;
  return c.json(body, status as never);
}

export function handleError(err: Error, c: Context): Response {
  console.error("[unhandled]", err);
  return errorResponse(c, 500, "Internal server error");
}
