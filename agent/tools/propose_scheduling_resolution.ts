import { always } from "eve/tools/approval";
import { defineTool } from "eve/tools";
import { PERMISSIONS } from "@recruiterpal/domain";
import { readWithTenant, authorizeTool, actionIdempotency } from "../lib/boundary";
import { baseToolInput, proposalOutput } from "../lib/schemas";
import { proposeAgentAction, restrictedAgentDb } from "@recruiterpal/agent-runtime";
import * as s from "@recruiterpal/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const inputSchema = baseToolInput.extend({ interviewId: z.string().uuid(), startUtc: z.coerce.date(), endUtc: z.coerce.date(), rationale: z.string().trim().min(1).max(2000) });

export default defineTool({
  description: "Propose a calendar booking or reschedule for an interview after checking the interview belongs to the current organization. Human approval is always required.",
  inputSchema,
  outputSchema: proposalOutput,
  approval: always(),
  async execute(input, ctx) {
    const access = authorizeTool(ctx, input, PERMISSIONS.INTERVIEW_WRITE, "A2");
    if (input.endUtc <= input.startUtc) throw new Error("INVALID_TIME_RANGE");
    const interview = await readWithTenant(access, async (tx) => {
      const [row] = await tx.select({ id: s.interviews.id, applicationId: s.interviews.applicationId, status: s.interviews.status, scheduledStartAt: s.interviews.scheduledStartAt, scheduledEndAt: s.interviews.scheduledEndAt }).from(s.interviews).where(and(eq(s.interviews.id, input.interviewId), eq(s.interviews.organizationId, access.tenant.organizationId))).limit(1);
      return row;
    });
    if (!interview) throw new Error("NOT_FOUND");
    const actionType = interview.status === "SCHEDULED" ? "reschedule_interview" : "book_calendar_event";
    const proposal = await proposeAgentAction(restrictedAgentDb(), access, {
      actionType,
      targetRefs: [`interview:${interview.id}`, `application:${interview.applicationId}`],
      parameters: { interviewId: interview.id, startUtc: input.startUtc.toISOString(), endUtc: input.endUtc.toISOString() },
      rationale: input.rationale,
      evidenceRefs: [`interview:${interview.id}`],
      idempotencyKey: actionIdempotency("propose_scheduling_resolution", access.sessionId, `${interview.id}:${input.startUtc.toISOString()}`),
    });
    return { ok: true, proposal, uiIntent: { type: "OPEN_SCHEDULING_RESOLUTION", targetId: interview.id } };
  },
});
