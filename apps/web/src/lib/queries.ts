/**
 * Server-side portfolio queries — read canonical PostgreSQL state through
 * tenant-scoped queries only.
 */
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import {
  applications,
  applicationObligations,
  availabilityWindows,
  applicationStageEvents,
  auditRecords,
  candidates,
  decisionReadinessSnapshots,
  exceptions,
  getDb,
  interviews,
  jobs,
  scorecards,
  withTenant,
  workflowInstances,
  type TenantContext,
} from "@recruiterpal/db";
import { pipelineRisk } from "@recruiterpal/integrations";

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

export async function getOpenExceptions(context: TenantContext): Promise<TodayExceptionRow[]> {
  const rows = await withTenant(getDb(), context, async (tx) =>
    tx
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
      .where(
        and(
          eq(exceptions.organizationId, context.organizationId),
          inArray(exceptions.status, OPEN_STATES),
        ),
      )
      .orderBy(desc(exceptions.severity), desc(exceptions.deadlineAt)),
  );
  return rows;
}

export function groupExceptionsByPriority(rows: TodayExceptionRow[]) {
  const rank = (s: string): number =>
    s === "CRITICAL" ? 0 : s === "HIGH" ? 1 : s === "MEDIUM" ? 2 : 3;
  const sorted = [...rows].sort((a, b) => {
    const bySev = rank(a.severity) - rank(b.severity);
    if (bySev !== 0) return bySev;
    if (a.deadlineAt && b.deadlineAt) return a.deadlineAt.getTime() - b.deadlineAt.getTime();
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
  const [openJobs, activeApps] = await withTenant(getDb(), context, async (tx) =>
    Promise.all([
      tx
        .select({ n: count() })
        .from(jobs)
        .where(and(eq(jobs.organizationId, context.organizationId), eq(jobs.status, "OPEN"))),
      tx
        .select({ n: count() })
        .from(applications)
        .where(
          and(
            eq(applications.organizationId, context.organizationId),
            eq(applications.status, "ACTIVE"),
          ),
        ),
    ]),
  );
  return {
    openJobs: openJobs[0]?.n ?? 0,
    activeApplications: activeApps[0]?.n ?? 0,
    criticalCount: 0,
  };
}

/** Applications approaching or past their candidate deadline. */
export async function getDeadlineApplications(context: TenantContext) {
  const rows = await withTenant(getDb(), context, (tx) =>
    tx
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
      .limit(10),
  );
  return rows.map((row) => ({
    ...row,
    deadlineUrgent:
      row.deadlineAt !== null && row.deadlineAt.getTime() - Date.now() < 36 * 3600_000,
  }));
}

export interface TodayAutomatedActivity {
  id: string;
  actorType: string;
  actionType: string;
  targetType: string;
  outcome: string;
  occurredAt: Date;
}

export interface TodayExecutionSnapshot {
  pendingObligations: number;
  overdueObligations: number;
  readinessReady: number;
  readinessReview: number;
  activeWorkflows: number;
  automatedActivity: TodayAutomatedActivity[];
}

/** Deterministic execution signals used by Today and the contextual Pal pane. */
export async function getTodayExecutionSnapshot(
  context: TenantContext,
): Promise<TodayExecutionSnapshot> {
  return withTenant(getDb(), context, async (tx) => {
    const now = new Date();
    const [pendingRows, overdueRows, workflowRows, readinessRows, activityRows] = await Promise.all(
      [
        tx
          .select({ n: count() })
          .from(applicationObligations)
          .where(
            and(
              eq(applicationObligations.organizationId, context.organizationId),
              eq(applicationObligations.state, "PENDING"),
            ),
          ),
        tx
          .select({ n: count() })
          .from(applicationObligations)
          .where(
            and(
              eq(applicationObligations.organizationId, context.organizationId),
              eq(applicationObligations.state, "PENDING"),
              sql`${applicationObligations.dueAt} < ${now}`,
            ),
          ),
        tx
          .select({ n: count() })
          .from(workflowInstances)
          .where(
            and(
              eq(workflowInstances.organizationId, context.organizationId),
              eq(workflowInstances.status, "RUNNING"),
            ),
          ),
        tx
          .select({
            applicationId: decisionReadinessSnapshots.applicationId,
            status: decisionReadinessSnapshots.status,
            computedAt: decisionReadinessSnapshots.computedAt,
          })
          .from(decisionReadinessSnapshots)
          .where(eq(decisionReadinessSnapshots.organizationId, context.organizationId))
          .orderBy(desc(decisionReadinessSnapshots.computedAt))
          .limit(500),
        tx
          .select({
            id: auditRecords.id,
            actorType: auditRecords.actorType,
            actionType: auditRecords.actionType,
            targetType: auditRecords.targetType,
            outcome: auditRecords.outcome,
            occurredAt: auditRecords.occurredAt,
          })
          .from(auditRecords)
          .where(
            and(
              eq(auditRecords.organizationId, context.organizationId),
              inArray(auditRecords.actorType, ["AGENT", "WORKFLOW"]),
            ),
          )
          .orderBy(desc(auditRecords.occurredAt))
          .limit(6),
      ],
    );

    const latestReadiness = new Map<string, string>();
    for (const row of readinessRows) {
      if (!latestReadiness.has(row.applicationId))
        latestReadiness.set(row.applicationId, row.status);
    }
    const readinessValues = [...latestReadiness.values()];

    return {
      pendingObligations: pendingRows[0]?.n ?? 0,
      overdueObligations: overdueRows[0]?.n ?? 0,
      readinessReady: readinessValues.filter((status) => status === "READY").length,
      readinessReview: readinessValues.filter((status) => status !== "READY").length,
      activeWorkflows: workflowRows[0]?.n ?? 0,
      automatedActivity: activityRows,
    };
  });
}

export interface AnalyticsSnapshot {
  timeInStage: Array<{ stage: string; applications: number; averageHours: number }>;
  slaBreaches: number;
  overdueScorecards: number;
  stageConversion: Array<{ stage: string; activeApplications: number }>;
  pipelineRisk: { level: string; signals: string[] };
  requirementDrift: number;
  ratingDisagreement: number;
  evidenceCompleteness: {
    applicationsWithReadiness: number;
    ready: number;
    reviewRequired: number;
  };
  interviewCapacity: number;
}

/** Portfolio analytics are descriptive signals, never candidate rankings or fit scores. */
export async function getAnalyticsSnapshot(context: TenantContext): Promise<AnalyticsSnapshot> {
  return withTenant(getDb(), context, async (tx) => {
    const now = new Date();
    const [
      applicationRows,
      obligationRows,
      scorecardRows,
      exceptionRows,
      readinessRows,
      availabilityRows,
      stageEventRows,
    ] = await Promise.all([
      tx
        .select({
          id: applications.id,
          stage: applications.currentStage,
          lastActivityAt: applications.lastActivityAt,
          protocolVersionId: applications.protocolVersionId,
          jobProtocolVersionId: jobs.activeProtocolVersionId,
          candidateDeadlineAt: applications.candidateDeadlineAt,
          deadlineVerified: applications.deadlineVerified,
        })
        .from(applications)
        .innerJoin(jobs, eq(jobs.id, applications.jobId))
        .where(
          and(
            eq(applications.organizationId, context.organizationId),
            eq(applications.status, "ACTIVE"),
          ),
        )
        .limit(500),
      tx
        .select({ dueAt: applicationObligations.dueAt, state: applicationObligations.state })
        .from(applicationObligations)
        .where(
          and(
            eq(applicationObligations.organizationId, context.organizationId),
            inArray(applicationObligations.state, ["PENDING", "ESCALATED"]),
          ),
        ),
      tx
        .select({ status: scorecards.status, interviewStatus: interviews.status })
        .from(scorecards)
        .innerJoin(interviews, eq(interviews.id, scorecards.interviewId))
        .where(
          and(
            eq(scorecards.organizationId, context.organizationId),
            eq(interviews.status, "COMPLETED"),
          ),
        ),
      tx
        .select({ severity: exceptions.severity, status: exceptions.status })
        .from(exceptions)
        .where(
          and(
            eq(exceptions.organizationId, context.organizationId),
            inArray(exceptions.status, OPEN_STATES),
          ),
        ),
      tx
        .select({
          applicationId: decisionReadinessSnapshots.applicationId,
          status: decisionReadinessSnapshots.status,
          computedAt: decisionReadinessSnapshots.computedAt,
        })
        .from(decisionReadinessSnapshots)
        .where(eq(decisionReadinessSnapshots.organizationId, context.organizationId))
        .orderBy(desc(decisionReadinessSnapshots.computedAt))
        .limit(500),
      tx
        .select({ startUtc: availabilityWindows.startUtc, endUtc: availabilityWindows.endUtc })
        .from(availabilityWindows)
        .where(
          and(
            eq(availabilityWindows.organizationId, context.organizationId),
            sql`${availabilityWindows.endUtc} >= ${now}`,
          ),
        )
        .limit(500),
      tx
        .select({
          applicationId: applicationStageEvents.applicationId,
          stage: applicationStageEvents.toStage,
          occurredAt: applicationStageEvents.occurredAt,
        })
        .from(applicationStageEvents)
        .where(eq(applicationStageEvents.organizationId, context.organizationId))
        .orderBy(desc(applicationStageEvents.occurredAt))
        .limit(1000),
    ]);

    const latestStage = new Map<string, { stage: string; occurredAt: Date }>();
    for (const event of stageEventRows)
      if (!latestStage.has(event.applicationId)) latestStage.set(event.applicationId, event);
    const stageAges = new Map<string, number[]>();
    for (const application of applicationRows) {
      const stage = latestStage.get(application.id)?.stage ?? application.stage;
      const enteredAt = latestStage.get(application.id)?.occurredAt ?? application.lastActivityAt;
      const ages = stageAges.get(stage) ?? [];
      ages.push(Math.max(0, now.getTime() - enteredAt.getTime()) / 3_600_000);
      stageAges.set(stage, ages);
    }
    const timeInStage = [...stageAges.entries()]
      .map(([stage, ages]) => ({
        stage,
        applications: ages.length,
        averageHours:
          Math.round((ages.reduce((total, age) => total + age, 0) / ages.length) * 10) / 10,
      }))
      .sort((a, b) => b.averageHours - a.averageHours);
    const stageConversion = [...new Set(applicationRows.map((application) => application.stage))]
      .map((stage) => ({
        stage,
        activeApplications: applicationRows.filter((application) => application.stage === stage)
          .length,
      }))
      .sort((a, b) => b.activeApplications - a.activeApplications);
    const pendingObligations = obligationRows.filter((row) => row.dueAt < now).length;
    const criticalExceptions = exceptionRows.filter((row) => row.severity === "CRITICAL").length;
    const unverifiedDeadlines = applicationRows.filter(
      (application) =>
        application.candidateDeadlineAt !== null && application.deadlineVerified !== "CONFIRMED",
    ).length;
    const latestReadiness = new Map<string, string>();
    for (const row of readinessRows)
      if (!latestReadiness.has(row.applicationId))
        latestReadiness.set(row.applicationId, row.status);
    const readinessValues = [...latestReadiness.values()];
    const requirementDrift = applicationRows.filter(
      (application) =>
        application.jobProtocolVersionId !== null &&
        application.protocolVersionId !== application.jobProtocolVersionId,
    ).length;
    return {
      timeInStage,
      slaBreaches: pendingObligations,
      overdueScorecards: scorecardRows.filter(
        (row) => !["SUBMITTED", "AMENDED"].includes(row.status),
      ).length,
      stageConversion,
      pipelineRisk: pipelineRisk({
        criticalExceptions,
        overdueObligations: pendingObligations,
        incompleteReadiness: readinessValues.filter((status) => status !== "READY").length,
        unverifiedDeadlines,
      }),
      requirementDrift,
      ratingDisagreement: readinessValues.filter((status) => status === "CONFLICT_REVIEW_REQUIRED")
        .length,
      evidenceCompleteness: {
        applicationsWithReadiness: readinessValues.length,
        ready: readinessValues.filter((status) => status === "READY").length,
        reviewRequired: readinessValues.filter((status) => status !== "READY").length,
      },
      interviewCapacity: availabilityRows.filter((window) => window.endUtc >= now).length,
    };
  });
}
