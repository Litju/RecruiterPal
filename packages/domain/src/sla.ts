/**
 * SLA arithmetic is deterministic domain code, never model reasoning.
 */
import type { ScorecardSlaState } from "./state-machines";

export interface SlaThresholds {
  /** Minutes after creation before the item is DUE_SOON. */
  readonly dueSoonMinutes: number;
  /** Minutes after creation before the item is OVERDUE. */
  readonly overdueMinutes: number;
  /** Minutes after creation before the item is ESCALATED. */
  readonly escalatedMinutes: number;
}

export const DEFAULT_SCORECARD_SLA: SlaThresholds = {
  dueSoonMinutes: 24 * 60,
  overdueMinutes: 48 * 60,
  escalatedMinutes: 96 * 60,
};

export const DEFAULT_CANDIDATE_RESPONSE_SLA_MINUTES = 72 * 60;
export const DEFAULT_STAGE_SLA_MINUTES = 5 * 24 * 60;

export function computeSlaState(
  createdAt: Date,
  now: Date,
  thresholds: SlaThresholds = DEFAULT_SCORECARD_SLA,
): ScorecardSlaState {
  const elapsedMs = now.getTime() - createdAt.getTime();
  if (elapsedMs >= thresholds.escalatedMinutes * 60_000) return "ESCALATED";
  if (elapsedMs >= thresholds.overdueMinutes * 60_000) return "OVERDUE";
  if (elapsedMs >= thresholds.dueSoonMinutes * 60_000) return "DUE_SOON";
  return "ON_TIME";
}

export function minutesUntilDeadline(deadlineAt: Date, now: Date): number {
  return Math.round((deadlineAt.getTime() - now.getTime()) / 60_000);
}

/** Stable idempotency key for external side effects. */
export function buildIdempotencyKey(params: {
  organizationId: string;
  workflowType: string;
  businessObjectId: string;
  actionType: string;
  policyVersion: string;
  logicalAttempt: number | string;
}): string {
  return [
    params.organizationId,
    params.workflowType,
    params.businessObjectId,
    params.actionType,
    params.policyVersion,
    String(params.logicalAttempt),
  ].join(":");
}
