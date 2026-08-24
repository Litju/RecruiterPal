import { defineAgent } from "eve";
import { createOpenCodeGoModel } from "@recruiterpal/agent-runtime";

export default defineAgent({
  description:
    "Evidence-analysis specialist that compares recorded evidence to protocol requirements without ranking or deciding employment outcomes.",
  model: createOpenCodeGoModel(),
  reasoning: "low",
  limits: {
    sessionTimeoutMs: 15 * 60 * 1000,
    maxInputTokensPerSession: 250_000,
    maxOutputTokensPerSession: 50_000,
  },
});
