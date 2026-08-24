/**
 * Canonical state machines for RecruiterPal.
 * Allowed transitions are explicit edges, never free strings.
 */

export const JOB_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "OPEN",
  "ON_HOLD",
  "CLOSED_FILLED",
  "CLOSED_CANCELLED",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const APPLICATION_STATUSES = [
  "ACTIVE",
  "WITHDRAWN",
  "REJECTED",
  "HIRED",
  "CANCELLED",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Consequential terminal states require configured human authority. */
export const CONSEQUENTIAL_APPLICATION_STATUSES: ReadonlySet<ApplicationStatus> =
  new Set(["REJECTED", "HIRED"]);

export const INTERVIEW_STATUSES = [
  "PLANNED",
  "AWAITING_AVAILABILITY",
  "SCHEDULED",
  "RESCHEDULE_REQUIRED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const SCORECARD_STATUSES = ["NOT_OPEN", "OPEN", "SUBMITTED", "AMENDED"] as const;
export type ScorecardStatus = (typeof SCORECARD_STATUSES)[number];

export const SCORECARD_SLA_STATES = ["ON_TIME", "DUE_SOON", "OVERDUE", "ESCALATED"] as const;
export type ScorecardSlaState = (typeof SCORECARD_SLA_STATES)[number];

export const DECISION_READINESS_STATUSES = [
  "NOT_APPLICABLE",
  "INCOMPLETE",
  "CONFLICT_REVIEW_REQUIRED",
  "APPROVAL_REQUIRED",
  "READY",
  "STALE",
] as const;
export type DecisionReadinessStatus = (typeof DECISION_READINESS_STATUSES)[number];

export const ACTION_PROPOSAL_STATUSES = [
  "PROPOSED",
  "AUTHORIZED_AUTOMATIC",
  "AWAITING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "EXECUTING",
  "WAITING_EXTERNAL",
  "SUCCEEDED",
  "FAILED_RETRYABLE",
  "FAILED_FINAL",
  "CANCELLED",
] as const;
export type ActionProposalStatus = (typeof ACTION_PROPOSAL_STATUSES)[number];

export const EXCEPTION_STATUSES = [
  "OPEN",
  "ACKNOWLEDGED",
  "AUTO_RESOLVING",
  "WAITING_EXTERNAL",
  "WAITING_HUMAN",
  "RESOLVED",
  "DISMISSED_WITH_REASON",
] as const;
export type ExceptionStatus = (typeof EXCEPTION_STATUSES)[number];

export const EXCEPTION_TYPES = [
  "overdue_scorecard",
  "scheduling_conflict",
  "candidate_response_overdue",
  "interviewer_decline",
  "evidence_missing",
  "material_rating_conflict",
  "protocol_drift",
  "stage_sla_breach",
  "offer_approval_delay",
  "integration_sync_error",
  "candidate_deadline_risk",
  "capacity_risk",
] as const;
export type ExceptionType = (typeof EXCEPTION_TYPES)[number];

export const APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED", "EXPIRED"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

// ---------------------------------------------------------------------------
// Transition maps
// ---------------------------------------------------------------------------

const JOB_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  DRAFT: ["PENDING_APPROVAL", "CLOSED_CANCELLED"],
  PENDING_APPROVAL: ["OPEN", "DRAFT", "CLOSED_CANCELLED"],
  OPEN: ["ON_HOLD", "CLOSED_FILLED", "CLOSED_CANCELLED"],
  ON_HOLD: ["OPEN", "CLOSED_FILLED", "CLOSED_CANCELLED"],
  CLOSED_FILLED: [],
  CLOSED_CANCELLED: [],
};

const INTERVIEW_TRANSITIONS: Record<InterviewStatus, readonly InterviewStatus[]> = {
  PLANNED: ["AWAITING_AVAILABILITY", "SCHEDULED", "CANCELLED"],
  AWAITING_AVAILABILITY: ["SCHEDULED", "RESCHEDULE_REQUIRED", "CANCELLED"],
  SCHEDULED: ["RESCHEDULE_REQUIRED", "COMPLETED", "CANCELLED", "NO_SHOW"],
  RESCHEDULE_REQUIRED: ["SCHEDULED", "AWAITING_AVAILABILITY", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: ["SCHEDULED", "CANCELLED"],
};

const SCORECARD_TRANSITIONS: Record<ScorecardStatus, readonly ScorecardStatus[]> = {
  NOT_OPEN: ["OPEN"],
  OPEN: ["SUBMITTED"],
  SUBMITTED: ["AMENDED"],
  AMENDED: ["AMENDED"],
};

export class IllegalTransitionError extends Error {
  constructor(
    public readonly entity: string,
    public readonly from: string,
    public readonly to: string,
  ) {
    super(`Illegal ${entity} transition: ${from} -> ${to}`);
    this.name = "IllegalTransitionError";
  }
}

export function canTransitionJob(from: JobStatus, to: JobStatus): boolean {
  return JOB_TRANSITIONS[from].includes(to);
}

export function assertJobTransition(from: JobStatus, to: JobStatus): void {
  if (!canTransitionJob(from, to)) throw new IllegalTransitionError("job_status", from, to);
}

export function canTransitionInterview(from: InterviewStatus, to: InterviewStatus): boolean {
  return INTERVIEW_TRANSITIONS[from].includes(to);
}

export function assertInterviewTransition(
  from: InterviewStatus,
  to: InterviewStatus,
): void {
  if (!canTransitionInterview(from, to))
    throw new IllegalTransitionError("interview_status", from, to);
}

export function canTransitionScorecard(from: ScorecardStatus, to: ScorecardStatus): boolean {
  return SCORECARD_TRANSITIONS[from].includes(to);
}

export function assertScorecardTransition(
  from: ScorecardStatus,
  to: ScorecardStatus,
): void {
  if (!canTransitionScorecard(from, to))
    throw new IllegalTransitionError("scorecard_status", from, to);
}

/**
 * Opening a job requires an approved hiring protocol version. Enforced here so
 * every call site inherits the invariant.
 */
export function canOpenJob(params: { hasApprovedProtocolVersion: boolean }): boolean {
  return params.hasApprovedProtocolVersion;
}
