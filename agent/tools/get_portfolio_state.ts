import { defineTool } from "eve/tools";
import { PERMISSIONS } from "@recruiterpal/domain";
import { readWithTenant, authorizeTool } from "../lib/boundary";
import { baseToolInput, listOutput } from "../lib/schemas";
import * as s from "@recruiterpal/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export default defineTool({
  description: "Read the current organization portfolio: active applications, open exceptions, obligations, and deadlines.",
  inputSchema: baseToolInput,
  outputSchema: listOutput,
  async execute(input, ctx) {
    const access = authorizeTool(ctx, input, PERMISSIONS.APPLICATION_READ, "A0");
    return readWithTenant(access, async (tx) => {
      const jobs = await tx.select({ id: s.jobs.id, title: s.jobs.title, status: s.jobs.status }).from(s.jobs).where(eq(s.jobs.organizationId, access.tenant.organizationId));
      const applications = await tx.select({ id: s.applications.id, jobId: s.applications.jobId, candidateId: s.applications.candidateId, status: s.applications.status, currentStage: s.applications.currentStage, nextExpectedActionAt: s.applications.nextExpectedActionAt, candidateDeadlineAt: s.applications.candidateDeadlineAt, deadlineVerified: s.applications.deadlineVerified }).from(s.applications).where(and(eq(s.applications.organizationId, access.tenant.organizationId), inArray(s.applications.status, ["ACTIVE", "HIRED", "REJECTED"])));
      const exceptions = await tx.select({ id: s.exceptions.id, type: s.exceptions.type, severity: s.exceptions.severity, title: s.exceptions.title, status: s.exceptions.status, applicationId: s.exceptions.applicationId, deadlineAt: s.exceptions.deadlineAt }).from(s.exceptions).where(and(eq(s.exceptions.organizationId, access.tenant.organizationId), inArray(s.exceptions.status, ["OPEN", "ACKNOWLEDGED", "WAITING_HUMAN"])));
      const obligations = await tx.select({ id: s.applicationObligations.id, obligationType: s.applicationObligations.obligationType, dueAt: s.applicationObligations.dueAt, state: s.applicationObligations.state, applicationId: s.applicationObligations.applicationId, interviewId: s.applicationObligations.interviewId }).from(s.applicationObligations).where(and(eq(s.applicationObligations.organizationId, access.tenant.organizationId), eq(s.applicationObligations.state, "PENDING")));
      return { ok: true, data: { jobs, applications, exceptions, obligations } };
    });
  },
});
