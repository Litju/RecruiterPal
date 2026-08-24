import { sleep } from "workflow";
import { executeWorkflowStep } from "./step";
import { normalizeWorkflowInput, type WorkflowInput, type WorkflowResult } from "./workflow-input";

export async function scorecardChaseWorkflow(input: WorkflowInput): Promise<WorkflowResult> {
  "use workflow";
  const normalized = normalizeWorkflowInput({ ...input, workflowType: "scorecard_chase" });
  if (normalized.resumeAt) await sleep(normalized.resumeAt);
  return executeWorkflowStep(normalized);
}

export async function candidateFollowUpWorkflow(input: WorkflowInput): Promise<WorkflowResult> {
  "use workflow";
  const normalized = normalizeWorkflowInput({ ...input, workflowType: "candidate_follow_up" });
  if (normalized.resumeAt) await sleep(normalized.resumeAt);
  return executeWorkflowStep(normalized);
}

export async function schedulingResolutionWorkflow(input: WorkflowInput): Promise<WorkflowResult> {
  "use workflow";
  const normalized = normalizeWorkflowInput({ ...input, workflowType: "scheduling_resolution" });
  if (normalized.resumeAt) await sleep(normalized.resumeAt);
  return executeWorkflowStep(normalized);
}

export async function interviewerDeclineReplacementWorkflow(
  input: WorkflowInput,
): Promise<WorkflowResult> {
  "use workflow";
  const normalized = normalizeWorkflowInput({
    ...input,
    workflowType: "interviewer_decline_replacement",
  });
  if (normalized.resumeAt) await sleep(normalized.resumeAt);
  return executeWorkflowStep(normalized);
}

export async function integrationReconciliationWorkflow(
  input: WorkflowInput,
): Promise<WorkflowResult> {
  "use workflow";
  const normalized = normalizeWorkflowInput({
    ...input,
    workflowType: "integration_reconciliation",
  });
  if (normalized.resumeAt) await sleep(normalized.resumeAt);
  return executeWorkflowStep(normalized);
}

export async function staleExceptionReconciliationWorkflow(
  input: WorkflowInput,
): Promise<WorkflowResult> {
  "use workflow";
  const normalized = normalizeWorkflowInput({
    ...input,
    workflowType: "stale_exception_reconciliation",
  });
  if (normalized.resumeAt) await sleep(normalized.resumeAt);
  return executeWorkflowStep(normalized);
}

export async function deadlineCandidateEscalationWorkflow(
  input: WorkflowInput,
): Promise<WorkflowResult> {
  "use workflow";
  const normalized = normalizeWorkflowInput({
    ...input,
    workflowType: "deadline_candidate_escalation",
  });
  if (normalized.resumeAt) await sleep(normalized.resumeAt);
  return executeWorkflowStep(normalized);
}

export { normalizeWorkflowInput } from "./workflow-input";
