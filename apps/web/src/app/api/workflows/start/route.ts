import { NextResponse } from "next/server";
import { start } from "workflow/api";
import {
  candidateFollowUpWorkflow,
  deadlineCandidateEscalationWorkflow,
  integrationReconciliationWorkflow,
  interviewerDeclineReplacementWorkflow,
  normalizeWorkflowInput,
  scorecardChaseWorkflow,
  schedulingResolutionWorkflow,
  staleExceptionReconciliationWorkflow,
} from "@recruiterpal/workflows";
import { getAuth } from "../../../../lib/auth";
import { getSession } from "../../../../lib/session";

export async function POST(request: Request) {
  const session = await getSession(getAuth());
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body))
      return NextResponse.json({ error: "Workflow input must be an object" }, { status: 400 });
    const input = normalizeWorkflowInput({
      ...(body as Record<string, unknown>),
      organizationId: session.organizationId,
      userId: session.userId,
    });
    let run;
    switch (input.workflowType) {
      case "scorecard_chase":
        run = await start(scorecardChaseWorkflow, [input]);
        break;
      case "candidate_follow_up":
        run = await start(candidateFollowUpWorkflow, [input]);
        break;
      case "scheduling_resolution":
        run = await start(schedulingResolutionWorkflow, [input]);
        break;
      case "interviewer_decline_replacement":
        run = await start(interviewerDeclineReplacementWorkflow, [input]);
        break;
      case "integration_reconciliation":
        run = await start(integrationReconciliationWorkflow, [input]);
        break;
      case "stale_exception_reconciliation":
        run = await start(staleExceptionReconciliationWorkflow, [input]);
        break;
      case "deadline_candidate_escalation":
        run = await start(deadlineCandidateEscalationWorkflow, [input]);
        break;
    }
    return NextResponse.json({ workflowType: input.workflowType, runId: run.runId });
  } catch {
    return NextResponse.json({ error: "Invalid workflow input" }, { status: 400 });
  }
}
