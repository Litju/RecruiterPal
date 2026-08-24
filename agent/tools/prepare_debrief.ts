import { defineTool } from "eve/tools";
import { PERMISSIONS } from "@recruiterpal/domain";
import { readWithTenant, authorizeTool } from "../lib/boundary";
import { idInput, listOutput } from "../lib/schemas";
import * as s from "@recruiterpal/db/schema";
import { and, eq, desc } from "drizzle-orm";

export default defineTool({
  description: "Prepare an evidence-linked debrief view for an application. It summarizes recorded observations and disagreements without ranking a candidate.",
  inputSchema: idInput,
  outputSchema: listOutput,
  async execute(input, ctx) {
    const access = authorizeTool(ctx, input, PERMISSIONS.EVIDENCE_READ, "A0");
    return readWithTenant(access, async (tx) => {
      const [application] = await tx.select({ id: s.applications.id, currentStage: s.applications.currentStage, protocolVersionId: s.applications.protocolVersionId }).from(s.applications).where(and(eq(s.applications.id, input.id), eq(s.applications.organizationId, access.tenant.organizationId))).limit(1);
      if (!application) throw new Error("NOT_FOUND");
      const observations = await tx.select({ id: s.evidenceObservations.id, competencyId: s.evidenceObservations.competencyId, sourceType: s.evidenceObservations.sourceType, observation: s.evidenceObservations.observation, rating: s.evidenceObservations.rating, provenance: s.evidenceObservations.provenance }).from(s.evidenceObservations).where(and(eq(s.evidenceObservations.applicationId, application.id), eq(s.evidenceObservations.organizationId, access.tenant.organizationId), eq(s.evidenceObservations.protocolVersionId, application.protocolVersionId))).orderBy(desc(s.evidenceObservations.observedAt));
      const scorecards = await tx.select({ id: s.scorecards.id, interviewId: s.scorecards.interviewId, raterUserId: s.scorecards.raterUserId, status: s.scorecards.status }).from(s.scorecards).where(and(eq(s.scorecards.applicationId, application.id), eq(s.scorecards.organizationId, access.tenant.organizationId)));
      return { ok: true, data: { application, observations, scorecards, humanDecisionRequired: true, note: "This debrief contains evidence only; it is not a candidate ranking or employment decision." } };
    });
  },
});
