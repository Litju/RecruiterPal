import { defineEvalConfig } from "eve/evals";

export default defineEvalConfig({
  timeoutMs: 30_000,
  maxConcurrency: 1,
});
