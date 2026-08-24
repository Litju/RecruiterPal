import { defineTool } from "eve/tools";
import { PERMISSIONS } from "@recruiterpal/domain";
import { readWithTenant, authorizeTool } from "../lib/boundary";
import { idInput, listOutput } from "../lib/schemas";
import * as s from "@recruiterpal/db/schema";
import { and, desc, eq } from "drizzle-orm";

export default defineTool({
  description: "Read the latest deterministic decision-readiness snapshot for an application; never calculate or invent a fit score.",
  inputSchema: idInput,
  outputSchema: listOutput,
  async execute(input, ctx) {
    const access = authorizeTool(ctx, input, PERMISSIONS.EVIDENCE_READ, "A0");
    return readWithTenant(access, async (tx) => {
      const [application] = await tx.select({ id: s.applications.id, currentStage: s.applications.currentStage, protocolVersionId: s.applications.protocolVersionId }).from(s.applications).where(and(eq(s.applications.id, input.id), eq(s.applications.organizationId, access.tenant.organizationId))).limit(1);
      if (!application) throw new Error("NOT_FOUND");
      const [snapshot] = await tx.select().from(s.decisionReadinessSnapshots).where(and(eq(s.decisionReadinessSnapshots.applicationId, application.id), eq(s.decisionReadinessSnapshots.organizationId, access.tenant.organizationId))).orderBy(desc(s.decisionReadinessSnapshots.computedAt)).limit(1);
      return { ok: true, data: { application, snapshot: snapshot ?? null, humanDecisionRequired: true } };
    });
  },
});
