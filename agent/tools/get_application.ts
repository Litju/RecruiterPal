import { defineTool } from "eve/tools";
import { PERMISSIONS } from "@recruiterpal/domain";
import { readWithTenant, authorizeTool } from "../lib/boundary";
import { idInput, listOutput } from "../lib/schemas";
import * as s from "@recruiterpal/db/schema";
import { and, eq, desc } from "drizzle-orm";

export default defineTool({
  description: "Read one application with its candidate, job, interview, and recent stage context.",
  inputSchema: idInput,
  outputSchema: listOutput,
  async execute(input, ctx) {
    const access = authorizeTool(ctx, input, PERMISSIONS.APPLICATION_READ, "A0");
    return readWithTenant(access, async (tx) => {
      const [application] = await tx
        .select()
        .from(s.applications)
        .where(
          and(
            eq(s.applications.id, input.id),
            eq(s.applications.organizationId, access.tenant.organizationId),
          ),
        )
        .limit(1);
      if (!application) throw new Error("NOT_FOUND");
      const [candidate] = await tx
        .select({
          id: s.candidates.id,
          firstName: s.candidates.firstName,
          lastName: s.candidates.lastName,
          headline: s.candidates.headline,
        })
        .from(s.candidates)
        .where(
          and(
            eq(s.candidates.id, application.candidateId),
            eq(s.candidates.organizationId, access.tenant.organizationId),
          ),
        )
        .limit(1);
      const [job] = await tx
        .select({ id: s.jobs.id, title: s.jobs.title, status: s.jobs.status })
        .from(s.jobs)
        .where(
          and(
            eq(s.jobs.id, application.jobId),
            eq(s.jobs.organizationId, access.tenant.organizationId),
          ),
        )
        .limit(1);
      const interviews = await tx
        .select({
          id: s.interviews.id,
          label: s.interviews.label,
          status: s.interviews.status,
          scheduledStartAt: s.interviews.scheduledStartAt,
          scheduledEndAt: s.interviews.scheduledEndAt,
        })
        .from(s.interviews)
        .where(
          and(
            eq(s.interviews.applicationId, application.id),
            eq(s.interviews.organizationId, access.tenant.organizationId),
          ),
        );
      const stageEvents = await tx
        .select({
          id: s.applicationStageEvents.id,
          fromStage: s.applicationStageEvents.fromStage,
          toStage: s.applicationStageEvents.toStage,
          reason: s.applicationStageEvents.reason,
          actorType: s.applicationStageEvents.actorType,
          occurredAt: s.applicationStageEvents.occurredAt,
        })
        .from(s.applicationStageEvents)
        .where(
          and(
            eq(s.applicationStageEvents.applicationId, application.id),
            eq(s.applicationStageEvents.organizationId, access.tenant.organizationId),
          ),
        )
        .orderBy(desc(s.applicationStageEvents.occurredAt))
        .limit(12);
      return { ok: true, data: { application, candidate, job, interviews, stageEvents } };
    });
  },
});
