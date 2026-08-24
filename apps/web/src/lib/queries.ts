/**
 * Server-side portfolio queries — read canonical PostgreSQL state through
 * tenant-scoped queries only.
 */
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { applications, candidates, exceptions, getDb, jobs, withTenant, type TenantContext } from "@recruiterpal/db";

export interface TodayExceptionRow {
  id: string;
  type: string;
  severity: string;
  title: string;
  detail: string;
  status: string;
  jobId: string | null;
  applicationId: string | null;
  interviewId: string | null;
  deadlineAt: Date | null;
  lastRecomputedAt: Date;
}

const OPEN_STATES = ["OPEN", "ACKNOWLEDGED", "AUTO_RESOLVING", "WAITING_EXTERNAL", "WAITING_HUMAN"];

export async function getOpenExceptions(
  context: TenantContext,
): Promise<TodayExceptionRow[]> {
  const rows = await withTenant(getDb(), context, async (tx) => tx
    .select({
      id: exceptions.id,
      type: exceptions.type,
      severity: exceptions.severity,
      title: exceptions.title,
      detail: exceptions.detail,
      status: exceptions.status,
      jobId: exceptions.jobId,
      applicationId: exceptions.applicationId,
      interviewId: exceptions.interviewId,
      deadlineAt: exceptions.deadlineAt,
      lastRecomputedAt: exceptions.lastRecomputedAt,
    })
    .from(exceptions)
    .where(and(eq(exceptions.organizationId, context.organizationId), inArray(exceptions.status, OPEN_STATES)))
    .orderBy(desc(exceptions.severity), desc(exceptions.deadlineAt)));
  return rows;
}

export function groupExceptionsByPriority(rows: TodayExceptionRow[]) {
  const rank = (s: string): number =>
    s === "CRITICAL" ? 0 : s === "HIGH" ? 1 : s === "MEDIUM" ? 2 : 3;
  const sorted = [...rows].sort((a, b) => {
    const bySev = rank(a.severity) - rank(b.severity);
    if (bySev !== 0) return bySev;
    if (a.deadlineAt && b.deadlineAt)
      return a.deadlineAt.getTime() - b.deadlineAt.getTime();
    if (a.deadlineAt) return -1;
    if (b.deadlineAt) return 1;
    return 0;
  });
  const isCritical = (r: TodayExceptionRow) => r.severity === "CRITICAL";
  const isBlocked = (r: TodayExceptionRow) =>
    r.severity === "HIGH" || r.type === "overdue_scorecard" || r.type === "scheduling_conflict";
  return {
    critical: sorted.filter(isCritical),
    blocked: sorted.filter((r) => !isCritical(r) && isBlocked(r)),
    signals: sorted.filter((r) => !isCritical(r) && !isBlocked(r)),
  };
}

export interface PortfolioCounts {
  openJobs: number;
  activeApplications: number;
  criticalCount: number;
}

export async function getPortfolioCounts(context: TenantContext): Promise<PortfolioCounts> {
  const [openJobs, activeApps] = await withTenant(getDb(), context, async (tx) => Promise.all([
    tx
      .select({ n: count() })
      .from(jobs)
      .where(and(eq(jobs.organizationId, context.organizationId), eq(jobs.status, "OPEN"))),
    tx
      .select({ n: count() })
      .from(applications)
      .where(and(eq(applications.organizationId, context.organizationId), eq(applications.status, "ACTIVE"))),
  ]));
  return {
    openJobs: openJobs[0]?.n ?? 0,
    activeApplications: activeApps[0]?.n ?? 0,
    criticalCount: 0,
  };
}

/** Applications approaching or past their candidate deadline. */
export async function getDeadlineApplications(context: TenantContext) {
  const rows = await withTenant(getDb(), context, (tx) => tx
    .select({
      id: applications.id,
      candidateName: sql<string>`${candidates.firstName} || ' ' || ${candidates.lastName}`,
      jobTitle: jobs.title,
      deadlineAt: applications.candidateDeadlineAt,
      verified: applications.deadlineVerified,
      stage: applications.currentStage,
    })
    .from(applications)
    .innerJoin(candidates, eq(candidates.id, applications.candidateId))
    .innerJoin(jobs, eq(jobs.id, applications.jobId))
    .where(
      and(
        eq(applications.organizationId, context.organizationId),
        eq(applications.status, "ACTIVE"),
        sql`${applications.candidateDeadlineAt} IS NOT NULL`,
      ),
    )
    .orderBy(applications.candidateDeadlineAt)
    .limit(10));
  return rows.map((row) => ({
    ...row,
    deadlineUrgent: row.deadlineAt !== null && row.deadlineAt.getTime() - Date.now() < 36 * 3600_000,
  }));
}
