/**
 * Authority classes govern what automation may do.
 * A0 read/inspect · A1 automatic administrative · A2 approval-required
 * operational · A3 consequential human decision.
 *
 * Eve can prepare A3 evidence and proposals but can never execute A3 actions.
 */

export const AUTHORITY_CLASSES = ["A0", "A1", "A2", "A3"] as const;
export type AuthorityClass = (typeof AUTHORITY_CLASSES)[number];

export interface ActorContext {
  /** Authenticated user id, or a stable system/workflow actor id. */
  readonly userId: string;
  readonly organizationId: string;
  readonly roles: readonly string[];
  readonly permissions: ReadonlySet<string>;
  readonly sessionId?: string;
  /** Who originates the action. */
  readonly origin: "human" | "agent" | "workflow" | "integration";
}

export const PERMISSIONS = {
  JOB_READ: "job:read",
  JOB_WRITE: "job:write",
  JOB_OPEN: "job:open",
  APPLICATION_READ: "application:read",
  APPLICATION_WRITE: "application:write",
  /** Consequential terminal transitions (reject/hire). Human-only. */
  DECIDE_TERMINAL: "decision:terminal",
  INTERVIEW_READ: "interview:read",
  INTERVIEW_WRITE: "interview:write",
  SCORECARD_READ: "scorecard:read",
  SCORECARD_SUBMIT: "scorecard:submit",
  EVIDENCE_READ: "evidence:read",
  EXCEPTION_READ: "exception:read",
  EXCEPTION_RESOLVE: "exception:resolve",
  APPROVAL_REQUEST: "approval:request",
  APPROVAL_DECIDE: "approval:decide",
  COMMUNICATION_SEND_AUTOMATED: "communication:send_automated",
  COMMUNICATION_SEND_REVIEWED: "communication:send_reviewed",
  AUDIT_READ: "audit:read",
  INTEGRATION_MANAGE: "integration:manage",
  POLICY_MANAGE: "policy:manage",
  RESTRICTED_DEMOGRAPHICS_READ: "restricted:demographics_read",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  owner: Object.values(PERMISSIONS),
  admin: [
    PERMISSIONS.JOB_READ,
    PERMISSIONS.JOB_WRITE,
    PERMISSIONS.JOB_OPEN,
    PERMISSIONS.APPLICATION_READ,
    PERMISSIONS.APPLICATION_WRITE,
    PERMISSIONS.INTERVIEW_READ,
    PERMISSIONS.INTERVIEW_WRITE,
    PERMISSIONS.SCORECARD_READ,
    PERMISSIONS.SCORECARD_SUBMIT,
    PERMISSIONS.EVIDENCE_READ,
    PERMISSIONS.EXCEPTION_READ,
    PERMISSIONS.EXCEPTION_RESOLVE,
    PERMISSIONS.APPROVAL_REQUEST,
    PERMISSIONS.APPROVAL_DECIDE,
    PERMISSIONS.COMMUNICATION_SEND_AUTOMATED,
    PERMISSIONS.COMMUNICATION_SEND_REVIEWED,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.INTEGRATION_MANAGE,
    PERMISSIONS.POLICY_MANAGE,
  ],
  recruiter: [
    PERMISSIONS.JOB_READ,
    PERMISSIONS.JOB_WRITE,
    PERMISSIONS.JOB_OPEN,
    PERMISSIONS.APPLICATION_READ,
    PERMISSIONS.APPLICATION_WRITE,
    PERMISSIONS.DECIDE_TERMINAL,
    PERMISSIONS.INTERVIEW_READ,
    PERMISSIONS.INTERVIEW_WRITE,
    PERMISSIONS.SCORECARD_READ,
    PERMISSIONS.EVIDENCE_READ,
    PERMISSIONS.EXCEPTION_READ,
    PERMISSIONS.EXCEPTION_RESOLVE,
    PERMISSIONS.APPROVAL_REQUEST,
    PERMISSIONS.COMMUNICATION_SEND_AUTOMATED,
    PERMISSIONS.COMMUNICATION_SEND_REVIEWED,
    PERMISSIONS.AUDIT_READ,
  ],
  hiring_manager: [
    PERMISSIONS.JOB_READ,
    PERMISSIONS.APPLICATION_READ,
    PERMISSIONS.EVIDENCE_READ,
    PERMISSIONS.SCORECARD_READ,
    PERMISSIONS.EXCEPTION_READ,
    PERMISSIONS.APPROVAL_DECIDE,
    PERMISSIONS.APPROVAL_REQUEST,
  ],
  interviewer: [
    PERMISSIONS.SCORECARD_READ,
    PERMISSIONS.SCORECARD_SUBMIT,
    PERMISSIONS.EVIDENCE_READ,
  ],
};

export function permissionsForRoles(roles: readonly string[]): Set<Permission> {
  const out = new Set<Permission>();
  for (const role of roles) {
    for (const p of ROLE_PERMISSIONS[role] ?? []) out.add(p);
  }
  return out;
}

export class UnauthorizedError extends Error {
  constructor(
    public readonly required: Permission | string,
    message?: string,
  ) {
    super(message ?? `Missing required permission: ${required}`);
    this.name = "UnauthorizedError";
  }
}

export function assertPermission(actor: ActorContext, permission: Permission): void {
  if (!actor.permissions.has(permission)) throw new UnauthorizedError(permission);
}

export function hasPermission(actor: ActorContext, permission: Permission): boolean {
  return actor.permissions.has(permission);
}

/**
 * Consequential employment decisions are human-only regardless of permission:
 * an agent-originated context can never satisfy them.
 */
export function assertHumanAuthority(actor: ActorContext, permission: Permission): void {
  if (actor.origin !== "human") {
    throw new UnauthorizedError(
      permission,
      `Consequential action ${permission} requires an authorized human actor; agent/automation origin is forbidden.`,
    );
  }
  assertPermission(actor, permission);
}
