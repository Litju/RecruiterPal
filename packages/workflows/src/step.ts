import { getDb } from "@recruiterpal/db";
import { executeWorkflow } from "./index";
import type { WorkflowInput, WorkflowResult } from "./workflow-input";

/** Node-backed work is isolated in a Workflow step; the orchestration bundle stays portable. */
export async function executeWorkflowStep(input: WorkflowInput): Promise<WorkflowResult> {
  "use step";
  return executeWorkflow(getDb(), input);
}
