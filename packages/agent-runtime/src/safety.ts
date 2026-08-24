import { defaultStageGraph, type ActionType } from "@recruiterpal/domain";

export const PROTECTED_AGENT_FIELDS = new Set([
  "protected_demographics",
  "gender",
  "race",
  "ethnicity",
  "age",
  "religion",
  "disability",
  "sexual_orientation",
]);

export function agentMayPropose(
  actionType: ActionType,
  authorityClass: "A0" | "A1" | "A2" | "A3",
): boolean {
  return (
    authorityClass !== "A3" && actionType !== "hire_candidate" && actionType !== "reject_candidate"
  );
}

export function protectedFieldIsIsolated(field: string): boolean {
  return PROTECTED_AGENT_FIELDS.has(field.toLowerCase());
}

export function contextsShareTenant(
  leftOrganizationId: string,
  rightOrganizationId: string,
): boolean {
  return leftOrganizationId === rightOrganizationId;
}

export function validAgentStageProposal(
  stages: readonly string[],
  from: string,
  to: string,
): boolean {
  if (to === "HIRED" || to === "REJECTED") return false;
  const allowed = defaultStageGraph(stages)[from] ?? [];
  return allowed.includes(to);
}

export function scorecardRequiresEscalation(
  submitted: number,
  required: number,
  overdue: boolean,
): boolean {
  return overdue && submitted < required;
}

export function materialConflictRequiresReview(conflictCount: number): boolean {
  return conflictCount > 0;
}

export function evidenceClaimIsSupported(claim: string, evidence: readonly string[]): boolean {
  return claim.trim().length > 0 && evidence.includes(claim);
}

export function approvalMayExecute(
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED",
  authorityClass: "A0" | "A1" | "A2" | "A3",
): boolean {
  return authorityClass !== "A2" || status === "APPROVED";
}
