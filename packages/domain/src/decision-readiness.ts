/**
 * DecisionReadiness measures whether the hiring *process* has sufficient
 * required evidence and approvals for a human to decide. It is deterministic,
 * never a candidate quality score, and never emits "fit" percentages.
 */
import type { DecisionReadinessStatus } from "./state-machines";

export interface ReadinessCheck {
  readonly check: string;
  readonly passed: boolean;
  readonly detail: string;
}

export interface ReadinessInput {
  readonly applicationStatus: "ACTIVE" | "WITHDRAWN" | "REJECTED" | "HIRED" | "CANCELLED";
  /** Required assessment stages per protocol; all must be complete. */
  readonly requiredStagesComplete: boolean;
  readonly incompleteStageNames: readonly string[];
  /** Every interview marked COMPLETED must have its required scorecards submitted. */
  readonly missingScorecardCount: number;
  /** Required competencies lacking at least one valid evidence source. */
  readonly competenciesMissingEvidence: readonly string[];
  /** Evidence collected under an older protocol version without migration review. */
  readonly staleProtocolEvidenceCount: number;
  /** Material rating conflicts (crossings of an advancement threshold). */
  readonly materialConflicts: readonly {
    readonly competencyName: string;
    readonly description: string;
  }[];
  /** Required approvals not yet granted (e.g. offer approval). */
  readonly missingApprovals: readonly string[];
}

export interface ReadinessConflict {
  readonly competency: string;
  readonly description: string;
}

export interface DecisionReadinessResult {
  readonly status: DecisionReadinessStatus;
  readonly reasons: readonly string[];
  readonly missingEvidence: readonly string[];
  readonly conflicts: readonly ReadinessConflict[];
  readonly missingApprovals: readonly string[];
  readonly staleProtocolFlags: readonly string[];
  readonly checks: readonly ReadinessCheck[];
}

const ORDERED_STATUSES: readonly DecisionReadinessStatus[] = [
  "INCOMPLETE",
  "CONFLICT_REVIEW_REQUIRED",
  "APPROVAL_REQUIRED",
];

/**
 * Deterministic readiness computation.
 *
 * Priority: NOT_APPLICABLE (terminal app) > INCOMPLETE > CONFLICT_REVIEW_REQUIRED >
 * APPROVAL_REQUIRED > READY. STALE is set by callers when the snapshot predates
 * a protocol change; computation itself returns the freshest evaluation.
 */
export function computeDecisionReadiness(input: ReadinessInput): DecisionReadinessResult {
  const checks: ReadinessCheck[] = [];
  const reasons: string[] = [];
  const missingEvidence: string[] = [];
  const conflicts = input.materialConflicts.map((c) => ({
    competency: c.competencyName,
    description: c.description,
  }));
  const staleProtocolFlags: string[] = [];

  if (input.applicationStatus !== "ACTIVE") {
    return {
      status: "NOT_APPLICABLE",
      reasons: [
        `Application status ${input.applicationStatus} is terminal; readiness does not apply.`,
      ],
      missingEvidence: [],
      conflicts: [],
      missingApprovals: [],
      staleProtocolFlags: [],
      checks: [
        {
          check: "application_active",
          passed: false,
          detail: `Application status is ${input.applicationStatus}.`,
        },
      ],
    };
  }

  checks.push({
    check: "required_stages_complete",
    passed: input.requiredStagesComplete,
    detail: input.requiredStagesComplete
      ? "All required assessment stages are complete."
      : `Incomplete stages: ${input.incompleteStageNames.join(", ")}.`,
  });
  if (!input.requiredStagesComplete) {
    reasons.push(`Required stages incomplete: ${input.incompleteStageNames.join(", ")}.`);
    missingEvidence.push(...input.incompleteStageNames.map((s) => `stage:${s}:completion`));
  }

  checks.push({
    check: "scorecards_submitted",
    passed: input.missingScorecardCount === 0,
    detail:
      input.missingScorecardCount === 0
        ? "All required scorecards are submitted."
        : `${input.missingScorecardCount} required scorecard(s) missing.`,
  });
  if (input.missingScorecardCount > 0) {
    reasons.push(`${input.missingScorecardCount} required scorecard(s) not submitted.`);
    missingEvidence.push(`scorecard:missing:${input.missingScorecardCount}`);
  }

  checks.push({
    check: "competency_evidence_complete",
    passed: input.competenciesMissingEvidence.length === 0,
    detail:
      input.competenciesMissingEvidence.length === 0
        ? "Every required competency has valid evidence."
        : `No valid evidence for: ${input.competenciesMissingEvidence.join(", ")}.`,
  });
  if (input.competenciesMissingEvidence.length > 0) {
    reasons.push(
      `Missing evidence for required competencies: ${input.competenciesMissingEvidence.join(", ")}.`,
    );
    missingEvidence.push(
      ...input.competenciesMissingEvidence.map((c) => `competency:${c}:evidence`),
    );
  }

  checks.push({
    check: "protocol_version_current",
    passed: input.staleProtocolEvidenceCount === 0,
    detail:
      input.staleProtocolEvidenceCount === 0
        ? "Evidence uses the active protocol version."
        : `${input.staleProtocolEvidenceCount} evidence item(s) from an older protocol version.`,
  });
  if (input.staleProtocolEvidenceCount > 0) {
    staleProtocolFlags.push(
      `${input.staleProtocolEvidenceCount} evidence item(s) predate the active protocol version and require compatibility review.`,
    );
  }

  checks.push({
    check: "no_material_conflicts",
    passed: conflicts.length === 0,
    detail:
      conflicts.length === 0
        ? "No material rating conflicts detected."
        : conflicts.map((c) => c.description).join(" "),
  });
  if (conflicts.length > 0) {
    reasons.push(`Material rating conflict(s): ${conflicts.map((c) => c.description).join("; ")}`);
  }

  checks.push({
    check: "approvals_present",
    passed: input.missingApprovals.length === 0,
    detail:
      input.missingApprovals.length === 0
        ? "All required approvals present."
        : `Awaiting approvals: ${input.missingApprovals.join(", ")}.`,
  });
  if (input.missingApprovals.length > 0) {
    reasons.push(`Required approvals pending: ${input.missingApprovals.join(", ")}.`);
  }

  let status: DecisionReadinessStatus = "READY";
  for (const blocked of ORDERED_STATUSES) {
    if (
      (blocked === "INCOMPLETE" && missingEvidence.length > 0) ||
      (blocked === "CONFLICT_REVIEW_REQUIRED" && conflicts.length > 0) ||
      (blocked === "APPROVAL_REQUIRED" && input.missingApprovals.length > 0)
    ) {
      status = blocked;
      break;
    }
  }
  // Conflicts outrank approvals in severity ordering but INCOMPLETE dominates all.

  return {
    status,
    reasons,
    missingEvidence,
    conflicts,
    missingApprovals: [...input.missingApprovals],
    staleProtocolFlags,
    checks,
  };
}
