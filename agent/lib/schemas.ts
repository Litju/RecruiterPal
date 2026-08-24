import { z } from "zod";
import { agentContextInputSchema } from "@recruiterpal/agent-runtime";

export const baseToolInput = agentContextInputSchema;
export const idInput = baseToolInput.extend({ id: z.string().uuid() });
export const applicationInput = idInput.extend({ applicationId: z.string().uuid() });
export const optionalApplicationInput = baseToolInput.extend({
  applicationId: z.string().uuid().optional(),
});
export const listOutput = z.object({
  ok: z.boolean(),
  data: z.record(z.string(), z.unknown()),
});
export const proposalOutput = z.object({
  ok: z.boolean(),
  proposal: z.record(z.string(), z.unknown()),
  uiIntent: z.record(z.string(), z.unknown()).optional(),
});
