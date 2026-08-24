import { always } from "eve/tools/approval";
import { defineTool } from "eve/tools";
import { PERMISSIONS } from "@recruiterpal/domain";
import { readWithTenant, authorizeTool, actionIdempotency } from "../lib/boundary";
import { baseToolInput, proposalOutput } from "../lib/schemas";
import { proposeAgentAction, restrictedAgentDb } from "@recruiterpal/agent-runtime";
import * as s from "@recruiterpal/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const inputSchema = baseToolInput.extend({
  applicationId: z.string().uuid(),
  subject: z.string().trim().min(1).max(240),
  body: z.string().trim().min(1).max(5000),
  rationale: z.string().trim().min(1).max(2000),
});

export default defineTool({
  description:
    "Draft a candidate communication grounded in the current application context. Sending always requires human review and approval.",
  inputSchema,
  outputSchema: proposalOutput,
  approval: always(),
  async execute(input, ctx) {
    const access = authorizeTool(ctx, input, PERMISSIONS.COMMUNICATION_SEND_REVIEWED, "A2");
    const application = await readWithTenant(access, async (tx) => {
      const [row] = await tx
        .select({
          id: s.applications.id,
          candidateId: s.applications.candidateId,
          currentStage: s.applications.currentStage,
        })
        .from(s.applications)
        .where(
          and(
            eq(s.applications.id, input.applicationId),
            eq(s.applications.organizationId, access.tenant.organizationId),
          ),
        )
        .limit(1);
      return row;
    });
    if (!application) throw new Error("NOT_FOUND");
    const proposal = await proposeAgentAction(restrictedAgentDb(), access, {
      actionType: "draft_message",
      targetRefs: [`application:${application.id}`, `candidate:${application.candidateId}`],
      parameters: {
        subject: input.subject,
        body: input.body,
        currentStage: application.currentStage,
      },
      rationale: input.rationale,
      evidenceRefs: [`application:${application.id}`],
      idempotencyKey: actionIdempotency(
        "draft_candidate_communication",
        access.sessionId,
        application.id,
      ),
    });
    return { ok: true, proposal, uiIntent: { type: "OPEN_ACTION_PREVIEW", targetId: proposal.id } };
  },
});
