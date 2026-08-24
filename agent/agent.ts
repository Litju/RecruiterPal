import { defineAgent } from "eve";
import { createOpenCodeGoModel, OPENCODE_GO_MODEL } from "@recruiterpal/agent-runtime";

/** Pal: contextual recruiting operations, bounded by deterministic policy. */
export default defineAgent({
  description: "Pal is RecruiterPal's evidence-first recruiting operations agent. It retrieves context, explains uncertainty, and proposes bounded actions while keeping consequential employment authority with a human.",
  model: createOpenCodeGoModel(),
  modelContextWindowTokens: 128000,
  reasoning: "medium",
  limits: {
    sessionTimeoutMs: 30 * 24 * 60 * 60 * 1000,
    maxInputTokensPerSession: 2_000_000,
    maxOutputTokensPerSession: 300_000,
  },
  experimental: {
    subagentPersistentSessions: false,
  },
});

export { OPENCODE_GO_MODEL };
