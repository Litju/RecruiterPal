import { defineTool } from "eve/tools";
import { z } from "zod";
import { PERMISSIONS } from "@recruiterpal/domain";
import { readWithTenant, authorizeTool } from "../lib/boundary";
import { baseToolInput, listOutput } from "../lib/schemas";
import * as s from "@recruiterpal/db/schema";
import { and, eq, gte, lte, asc, inArray } from "drizzle-orm";

const inputSchema = baseToolInput.extend({
  interviewId: z.string().uuid(),
  fromUtc: z.coerce.date(),
  toUtc: z.coerce.date(),
});

export default defineTool({
  description:
    "Read declared interviewer availability and existing calendar events for a specific interview window.",
  inputSchema,
  outputSchema: listOutput,
  async execute(input, ctx) {
    const access = authorizeTool(ctx, input, PERMISSIONS.INTERVIEW_READ, "A0");
    return readWithTenant(access, async (tx) => {
      const [interview] = await tx
        .select({
          id: s.interviews.id,
          applicationId: s.interviews.applicationId,
          label: s.interviews.label,
          status: s.interviews.status,
        })
        .from(s.interviews)
        .where(
          and(
            eq(s.interviews.id, input.interviewId),
            eq(s.interviews.organizationId, access.tenant.organizationId),
          ),
        )
        .limit(1);
      if (!interview) throw new Error("NOT_FOUND");
      const participants = await tx
        .select({
          userId: s.interviewParticipants.userId,
          role: s.interviewParticipants.role,
          required: s.interviewParticipants.required,
          declined: s.interviewParticipants.declined,
        })
        .from(s.interviewParticipants)
        .where(eq(s.interviewParticipants.interviewId, interview.id));
      const userIds = participants
        .filter((participant) => !participant.declined)
        .map((participant) => participant.userId);
      const availability =
        userIds.length === 0
          ? []
          : await tx
              .select({
                userId: s.availabilityWindows.userId,
                startUtc: s.availabilityWindows.startUtc,
                endUtc: s.availabilityWindows.endUtc,
                source: s.availabilityWindows.source,
              })
              .from(s.availabilityWindows)
              .where(
                and(
                  eq(s.availabilityWindows.organizationId, access.tenant.organizationId),
                  inArray(s.availabilityWindows.userId, userIds),
                  gte(s.availabilityWindows.endUtc, input.fromUtc),
                  lte(s.availabilityWindows.startUtc, input.toUtc),
                ),
              )
              .orderBy(asc(s.availabilityWindows.startUtc));
      const calendarEvents = await tx
        .select({
          id: s.calendarEvents.id,
          startUtc: s.calendarEvents.startUtc,
          endUtc: s.calendarEvents.endUtc,
          provider: s.calendarEvents.provider,
          status: s.calendarEvents.status,
        })
        .from(s.calendarEvents)
        .where(
          and(
            eq(s.calendarEvents.organizationId, access.tenant.organizationId),
            gte(s.calendarEvents.endUtc, input.fromUtc),
            lte(s.calendarEvents.startUtc, input.toUtc),
          ),
        );
      return { ok: true, data: { interview, participants, availability, calendarEvents } };
    });
  },
});
