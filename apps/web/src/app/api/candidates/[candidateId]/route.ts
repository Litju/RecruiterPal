import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { withSessionTenant } from "@/lib/tenant-db";
import {
  applications,
  applicationStageEvents,
  candidates,
  competencies,
  decisionReadinessSnapshots,
  evidenceObservations,
  jobs,
  scorecardRatings,
  scorecards,
} from "@recruiterpal/db";

const candidateIdSchema = z.string().uuid();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ candidateId: string }> },
) {
  const session = await getSession(getAuth());
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { candidateId } = await params;
  if (!candidateIdSchema.safeParse(candidateId).success) {
    return NextResponse.json({ error: "INVALID_CANDIDATE_ID" }, { status: 400 });
  }

  const workspace = await withSessionTenant(session, async (tx) => {
    const [candidate] = await tx
      .select({ id: candidates.id, firstName: candidates.firstName, lastName: candidates.lastName, headline: candidates.headline, source: candidates.source })
      .from(candidates)
      .where(and(eq(candidates.organizationId, session.organizationId), eq(candidates.id, candidateId)))
      .limit(1);
    if (!candidate) return null;

    const applicationRows = await tx
      .select({
        id: applications.id,
        status: applications.status,
        stage: applications.currentStage,
        candidateDeadlineAt: applications.candidateDeadlineAt,
        deadlineVerified: applications.deadlineVerified,
        lastActivityAt: applications.lastActivityAt,
        jobTitle: jobs.title,
      })
      .from(applications)
      .innerJoin(jobs, eq(jobs.id, applications.jobId))
      .where(and(eq(applications.organizationId, session.organizationId), eq(applications.candidateId, candidate.id)))
      .orderBy(desc(applications.lastActivityAt));
    const applicationIds = applicationRows.map((application) => application.id);
    if (applicationIds.length === 0) return { candidate, applications: [], evidence: [], scorecards: [], ratings: [], readiness: [], timeline: [] };

    const [evidenceRows, scorecardRows, readinessRows, timelineRows] = await Promise.all([
      tx
        .select({ id: evidenceObservations.id, applicationId: evidenceObservations.applicationId, competencyId: evidenceObservations.competencyId, observation: evidenceObservations.observation, rating: evidenceObservations.rating, sourceType: evidenceObservations.sourceType, provenance: evidenceObservations.provenance, observedAt: evidenceObservations.observedAt })
        .from(evidenceObservations)
        .where(and(eq(evidenceObservations.organizationId, session.organizationId), inArray(evidenceObservations.applicationId, applicationIds)))
        .orderBy(desc(evidenceObservations.observedAt)),
      tx
        .select({ id: scorecards.id, applicationId: scorecards.applicationId, interviewId: scorecards.interviewId, raterUserId: scorecards.raterUserId, status: scorecards.status, submittedAt: scorecards.submittedAt })
        .from(scorecards)
        .where(and(eq(scorecards.organizationId, session.organizationId), inArray(scorecards.applicationId, applicationIds)))
        .orderBy(desc(scorecards.submittedAt)),
      tx
        .select({ id: decisionReadinessSnapshots.id, applicationId: decisionReadinessSnapshots.applicationId, status: decisionReadinessSnapshots.status, reasons: decisionReadinessSnapshots.reasons, computedAt: decisionReadinessSnapshots.computedAt })
        .from(decisionReadinessSnapshots)
        .where(and(eq(decisionReadinessSnapshots.organizationId, session.organizationId), inArray(decisionReadinessSnapshots.applicationId, applicationIds)))
        .orderBy(desc(decisionReadinessSnapshots.computedAt)),
      tx
        .select({ id: applicationStageEvents.id, applicationId: applicationStageEvents.applicationId, fromStage: applicationStageEvents.fromStage, toStage: applicationStageEvents.toStage, reason: applicationStageEvents.reason, actorType: applicationStageEvents.actorType, occurredAt: applicationStageEvents.occurredAt })
        .from(applicationStageEvents)
        .where(and(eq(applicationStageEvents.organizationId, session.organizationId), inArray(applicationStageEvents.applicationId, applicationIds)))
        .orderBy(desc(applicationStageEvents.occurredAt)),
    ]);
    const scorecardIds = scorecardRows.map((scorecard) => scorecard.id);
    const ratingRows = scorecardIds.length === 0
      ? []
      : await tx
          .select({ scorecardId: scorecardRatings.scorecardId, competencyId: scorecardRatings.competencyId, rating: scorecardRatings.rating, evidenceNote: scorecardRatings.evidenceNote, rubricAnchor: scorecardRatings.rubricAnchor })
          .from(scorecardRatings)
          .where(and(eq(scorecardRatings.organizationId, session.organizationId), inArray(scorecardRatings.scorecardId, scorecardIds)));
    const competencyIds = [...new Set([...evidenceRows.map((evidence) => evidence.competencyId), ...ratingRows.map((rating) => rating.competencyId)])];
    const competencyRows = await (competencyIds.length === 0
      ? Promise.resolve([])
      : tx
          .select({ id: competencies.id, name: competencies.name })
          .from(competencies)
          .where(and(eq(competencies.organizationId, session.organizationId), inArray(competencies.id, competencyIds))));
    const competencyNameById = new Map(competencyRows.map((competency) => [competency.id, competency.name]));
    const latestReadiness = new Map<string, (typeof readinessRows)[number]>();
    for (const readiness of readinessRows) if (!latestReadiness.has(readiness.applicationId)) latestReadiness.set(readiness.applicationId, readiness);
    return {
      candidate,
      applications: applicationRows,
      evidence: evidenceRows.map((evidence) => ({ ...evidence, competency: competencyNameById.get(evidence.competencyId) ?? "Unlabeled competency" })),
      scorecards: scorecardRows,
      ratings: ratingRows.map((rating) => ({ ...rating, competency: competencyNameById.get(rating.competencyId) ?? "Unlabeled competency" })),
      readiness: [...latestReadiness.values()],
      timeline: timelineRows,
    };
  });

  if (!workspace) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(workspace, { headers: { "Cache-Control": "private, no-store" } });
}
