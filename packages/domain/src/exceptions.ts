/**
 * Deterministic exception engine: recomputable predicates with stable
 * deduplication keys so re-scans update the same logical exception instead of
 * spamming duplicates.
 */
import type { ExceptionType } from "./state-machines.js";

export const EXCEPTION_SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export type ExceptionSeverity = (typeof EXCEPTION_SEVERITIES)[number];

export interface ExceptionCandidate {
  readonly type: ExceptionType;
  readonly organizationId: string;
  readonly jobId: string | null;
  readonly applicationId: string | null;
  readonly interviewId: string | null;
  /** Stable scope discriminator within a type. */
  readonly scopeKey: string;
  readonly severity: ExceptionSeverity;
  readonly title: string;
  readonly detail: string;
  readonly deadlineAt?: Date | null;
}

/** Stable dedup key per data contract: org:job/application:type:scope_version */
export function buildExceptionKey(e: {
  organizationId: string;
  jobId: string | null;
  applicationId: string | null;
  type: string;
  scopeKey: string;
}): string {
  const target = e.applicationId ?? e.jobId ?? "org";
  return `${e.organizationId}:${target}:${e.type}:${e.scopeKey}:v1`;
}

export interface TodayPriorityItem {
  readonly severity: ExceptionSeverity;
  readonly deadlineAt: Date | null;
  readonly type: ExceptionType;
}

const SEVERITY_RANK: Record<ExceptionSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

/**
 * Priority ordering for Today: severity first; earlier deadline breaks ties.
 * Explicit business rules — no hidden ML ranking on this surface.
 */
export function compareTodayPriority(
  a: TodayPriorityItem,
  b: TodayPriorityItem,
): number {
  const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (bySeverity !== 0) return bySeverity;
  if (a.deadlineAt && b.deadlineAt) {
    return a.deadlineAt.getTime() - b.deadlineAt.getTime();
  }
  if (a.deadlineAt) return -1;
  if (b.deadlineAt) return 1;
  return 0;
}

// ---------------------------------------------------------------------------
// Rating conflict detection
// ---------------------------------------------------------------------------

export interface ScorecardRatingForConflict {
  readonly scorecardId: string;
  readonly raterId: string;
  readonly competencyName: string;
  /** Rubric-anchored 1..5 rating. */
  readonly rating: number;
}

export interface MaterialConflictResult {
  readonly competencyName: string;
  readonly description: string;
  readonly ratings: readonly { raterId: string; rating: number }[];
  readonly spread: number;
}

/**
 * A material conflict exists when ratings for one competency straddle the
 * protocol's required level: at least one rater places the candidate below
 * the requirement while another places them at/above it (and the spread
 * reaches the configured minimum). Deterministic and labeled; never silently
 * averaged away.
 */
export function detectMaterialConflicts(params: {
  ratings: readonly ScorecardRatingForConflict[];
  /** Ratings differing by this much or more are candidates for review. */
  conflictSpread?: number;
  /** The protocol-required level whose crossing makes disagreement material. */
  requiredLevel?: number;
}): MaterialConflictResult[] {
  const { conflictSpread = 2, requiredLevel = 4 } = params;
  const byCompetency = new Map<string, ScorecardRatingForConflict[]>();
  for (const r of params.ratings) {
    const list = byCompetency.get(r.competencyName) ?? [];
    list.push(r);
    byCompetency.set(r.competencyName, list);
  }

  const conflicts: MaterialConflictResult[] = [];
  for (const [competencyName, ratings] of byCompetency) {
    if (ratings.length < 2) continue;
    const values = ratings.map((r) => r.rating);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = max - min;
    if (spread < conflictSpread) continue;
    const straddlesBoundary = min < requiredLevel && max >= requiredLevel;
    if (!straddlesBoundary) continue;
    conflicts.push({
      competencyName,
      description: `${competencyName} ratings range ${min}–${max} across ${ratings.length} raters, straddling the level-${requiredLevel} requirement.`,
      ratings: ratings.map((r) => ({ raterId: r.raterId, rating: r.rating })),
      spread,
    });
  }
  return conflicts.sort((a, b) => b.spread - a.spread);
}
