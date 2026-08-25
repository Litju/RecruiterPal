import { defineTool } from "eve/tools";
import { PERMISSIONS, assertStageTransition, defaultStageGraph } from "@recruiterpal/domain";
import { readWithTenant, authorizeTool, actionIdempotency } from "../lib/boundary";
import { baseToolInput, proposalOutput } from "../lib/schemas";
import { proposeAgentAction, restrictedAgentDb } from "@recruiterpal/agent-runtime";
import * as s from "@recruiterpal/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const inputSchema = baseToolInput.extend({
  applicationId: z.string().uuid(),
  fromStage: z.string().trim().min(1),
  toStage: z.string().trim().min(1),
  rationale: z.string().trim().min(1).max(2000),
  evidenceRefs: z.array(z.string()).default([]),
});

export default defineTool({
  description:
    "Propose a valid non-terminal application stage transition. RecruiterPal can never execute a hire or reject decision.",
  inputSchema,
  outputSchema: proposalOutput,
  async execute(input, ctx) {
    const access = authorizeTool(ctx, input, PERMISSIONS.APPLICATION_READ, "A0");
    const application = await readWithTenant(access, async (tx) => {
      const [row] = await tx
        .select({
          id: s.applications.id,
          currentStage: s.applications.currentStage,
          protocolVersionId: s.applications.protocolVersionId,
        })
        .from(s.applications)
        .where(
          and(
            eq(s.applications.id, input.applicationId),
            eq(s.applications.organizationId, access.tenant.organizationId),
          ),
        )
        .limit(1);
      if (!row) throw new Error("NOT_FOUND");
      const [protocol] = await tx
        .select({ stages: s.hiringProtocolVersions.stages })
        .from(s.hiringProtocolVersions)
        .where(
          and(
            eq(s.hiringProtocolVersions.id, row.protocolVersionId),
            eq(s.hiringProtocolVersions.organizationId, access.tenant.organizationId),
          ),
        )
        .limit(1);
      if (!protocol) throw new Error("STALE_PROTOCOL");
      return { ...row, stages: protocol.stages };
    });
    if (application.currentStage !== input.fromStage) throw new Error("STALE_STATE");
    if (input.toStage === "HIRED" || input.toStage === "REJECTED")
      throw new Error("AGENT_TERMINAL_DECISION_FORBIDDEN");
    assertStageTransition(
      defaultStageGraph(application.stages.map((stage) => stage.name)),
      input.fromStage,
      input.toStage,
    );
    const proposal = await proposeAgentAction(restrictedAgentDb(), access, {
      actionType: "propose_stage_transition",
      targetRefs: [`application:${application.id}`],
      parameters: {
        fromStage: input.fromStage,
        toStage: input.toStage,
        protocolVersionId: application.protocolVersionId,
      },
      rationale: input.rationale,
      evidenceRefs: input.evidenceRefs,
      idempotencyKey: actionIdempotency(
        "propose_stage_transition",
        access.sessionId,
        `${application.id}:${input.toStage}`,
      ),
    });
    return { ok: true, proposal, uiIntent: { type: "OPEN_ACTION_PREVIEW", targetId: proposal.id } };
  },
});
