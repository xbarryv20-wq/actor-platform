export const LIFECYCLE_ACTIONS = ["publish", "deprecate", "republish"] as const;
export type LifecycleAction = (typeof LIFECYCLE_ACTIONS)[number];
export type ActorLifecycleStatus = "DRAFT" | "PUBLISHED" | "DEPRECATED";

export const TRANSITION_TARGET: Record<LifecycleAction, ActorLifecycleStatus> = {
  publish: "PUBLISHED",
  deprecate: "DEPRECATED",
  republish: "PUBLISHED",
};

export const ALLOWED_ACTIONS: Record<ActorLifecycleStatus, LifecycleAction[]> = {
  DRAFT: ["publish"],
  PUBLISHED: ["deprecate"],
  DEPRECATED: ["republish"],
};

const LIFECYCLE_STATUSES = Object.keys(ALLOWED_ACTIONS) as ActorLifecycleStatus[];

export type TransitionResult =
  | { allowed: true; nextStatus: ActorLifecycleStatus }
  | { allowed: false; currentStatus: ActorLifecycleStatus; allowedActions: LifecycleAction[] };

export function computeTransition(
  currentStatus: string,
  action: LifecycleAction,
): TransitionResult {
  if (!LIFECYCLE_STATUSES.includes(currentStatus as ActorLifecycleStatus)) {
    return { allowed: false, currentStatus: currentStatus as ActorLifecycleStatus, allowedActions: [] };
  }

  const status = currentStatus as ActorLifecycleStatus;
  const allowed = ALLOWED_ACTIONS[status];

  if (!allowed.includes(action)) {
    return { allowed: false, currentStatus: status, allowedActions: allowed };
  }

  return { allowed: true, nextStatus: TRANSITION_TARGET[action] };
}
