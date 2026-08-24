import { defineTool } from "eve/tools";
import { PERMISSIONS } from "@recruiterpal/domain";
import { readWithTenant, authorizeTool } from "../lib/boundary";
import { idInput, listOutput } from "../lib/schemas";
import * as s from "@recruiterpal/db/schema";
import { and, eq } from "drizzle-orm";

export default defineTool({
  description: "Read a candidate's recruiting profile and applications in the current organization. Protected demographics are never returned.",
  inputSchema: idInput,
  outputSchema: listOutput,
  async execute(input, ctx) {
    const access = authorizeTool(ctx, input, PERMISSIONS.APPLICATION_READ, "A0");
    return readWithTenant(access, async (tx) => {
      const [candidate] = await tx.select({ id: s.candidates.id, organizationId: s.candidates.organizationId, firstName: s.candidates.firstName, lastName: s.candidates.lastName, email: s.candidates.email, headline: s.candidates.headline, source: s.candidates.source }).from(s.candidates).where(and(eq(s.candidates.id, input.id), eq(s.candidates.organizationId, access.tenant.organizationId))).limit(1);
      if (!candidate) throw new Error("NOT_FOUND");
      const applications = await tx.select({ id: s.applications.id, jobId: s.applications.jobId, status: s.applications.status, currentStage: s.applications.currentStage, protocolVersionId: s.applications.protocolVersionId, candidateDeadlineAt: s.applications.candidateDeadlineAt, deadlineVerified: s.applications.deadlineVerified }).from(s.applications).where(and(eq(s.applications.candidateId, candidate.id), eq(s.applications.organizationId, access.tenant.organizationId)));
      return { ok: true, data: { candidate, applications } };
    });
  },
});
