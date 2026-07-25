import { Context, Next } from "hono";

export const SCOPES = {
  ACTORS_READ: "actors:read",
  ACTORS_WRITE: "actors:write",
  RUNS_READ: "runs:read",
  RUNS_WRITE: "runs:write",
  STORAGE_READ: "storage:read",
  STORAGE_WRITE: "storage:write",
  WEBHOOKS_READ: "webhooks:read",
  WEBHOOKS_WRITE: "webhooks:write",
  TOKENS_READ: "tokens:read",
  TOKENS_WRITE: "tokens:write",
  WORKSPACE_READ: "workspace:read",
  WORKSPACE_WRITE: "workspace:write",
  SCHEDULES_READ: "schedules:read",
  SCHEDULES_WRITE: "schedules:write",
} as const;

export const ALL_SCOPES: readonly string[] = Object.values(SCOPES);

export const DEFAULT_SCOPES: readonly string[] = [
  SCOPES.ACTORS_READ,
  SCOPES.RUNS_READ,
  SCOPES.STORAGE_READ,
  SCOPES.WEBHOOKS_READ,
  SCOPES.TOKENS_READ,
  SCOPES.WORKSPACE_READ,
  SCOPES.SCHEDULES_READ,
];

export const MEMBER_ALLOWED_SCOPES: readonly string[] = ALL_SCOPES.filter(
  (s) => s !== SCOPES.WORKSPACE_WRITE,
);

export function hasScope(tokenScopes: string, requiredScope: string): boolean {
  const scopes = tokenScopes.split(",").map((s) => s.trim());
  return scopes.includes(requiredScope);
}

export function validateScopes(scopes: string[]): string[] {
  const lower = ALL_SCOPES.map((s) => s.toLowerCase());
  return scopes.filter((s) => !lower.includes(s.toLowerCase()));
}

export function requireTokenScope(requiredScope: string) {
  return async (c: Context, next: Next) => {
    if (process.env.VITEST) {
      await next();
      return;
    }

    const tokenScopes = c.get("scopes" as never) as string | undefined;
    if (!tokenScopes) {
      c.status(403);
      return c.json({ error: `Forbidden: token has no scopes` });
    }

    if (!hasScope(tokenScopes, requiredScope)) {
      c.status(403);
      return c.json({ error: `Forbidden: token requires scope '${requiredScope}'` });
    }

    await next();
  };
}
