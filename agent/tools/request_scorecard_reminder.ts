import { defineTool } from "eve/tools";
import { PERMISSIONS } from "@recruiterpal/domain";
import { readWithTenant, authorizeTool, actionIdempotency } from "../lib/boundary";
import { baseToolInput, proposalOutput } from "../lib/schemas";
import { proposeAgentAction, restrictedAgentDb } from "@recruiterpal/agent-runtime";
import * as s from "@recruiterpal/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const inputSchema = baseToolInput.extend({
  scorecardId: z.string().uuid(),
  message: z.string().trim().max(1000).optional(),
});

export default defineTool({
  description:
    "Request an idempotent scorecard reminder for an overdue or due-soon scorecard. The workflow sends it; Pal does not impersonate a person.",
  inputSchema,
  outputSchema: proposalOutput,
  async execute(input, ctx) {
    const access = authorizeTool(ctx, input, PERMISSIONS.COMMUNICATION_SEND_AUTOMATED, "A1");
    const scorecard = await readWithTenant(access, async (tx) => {
      const [row] = await tx
        .select({
          id: s.scorecards.id,
          applicationId: s.scorecards.applicationId,
          interviewId: s.scorecards.interviewId,
          raterUserId: s.scorecards.raterUserId,
          status: s.scorecards.status,
        })
        .from(s.scorecards)
        .where(
          and(
            eq(s.scorecards.id, input.scorecardId),
            eq(s.scorecards.organizationId, access.tenant.organizationId),
          ),
        )
        .limit(1);
      return row;
    });
    if (!scorecard) throw new Error("NOT_FOUND");
    if (scorecard.status === "SUBMITTED" || scorecard.status === "AMENDED")
      throw new Error("SCORECARD_ALREADY_SUBMITTED");
    const proposal = await proposeAgentAction(restrictedAgentDb(), access, {
      actionType: "send_scorecard_reminder",
      targetRefs: [`scorecard:${scorecard.id}`, `application:${scorecard.applicationId}`],
      parameters: {
        scorecardId: scorecard.id,
        interviewId: scorecard.interviewId,
        raterUserId: scorecard.raterUserId,
        message: input.message ?? "Please complete the scorecard with evidence-linked ratings.",
      },
      rationale:
        "The scorecard is not submitted; a deterministic reminder is permitted and will be audited.",
      evidenceRefs: [`scorecard:${scorecard.id}`],
      idempotencyKey: actionIdempotency(
        "request_scorecard_reminder",
        access.sessionId,
        scorecard.id,
      ),
    });
    return { ok: true, proposal, uiIntent: { type: "OPEN_ACTION_PREVIEW", targetId: proposal.id } };
  },
});
