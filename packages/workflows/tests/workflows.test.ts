import { describe, expect, it } from "vitest";
import { buildWorkflowPlan, normalizeWorkflowInput, type WorkflowSnapshot } from "../src/index";

const org = "00000000-0000-4000-8000-000000000001";
const user = "00000000-0000-4000-8000-000000000002";
const application = "00000000-0000-4000-8000-000000000003";
const interview = "00000000-0000-4000-8000-000000000004";
const now = new Date("2026-08-24T12:00:00.000Z");

function input(workflowType: Parameters<typeof normalizeWorkflowInput>[0]["workflowType"]) {
  return normalizeWorkflowInput({
    workflowType,
    organizationId: org,
    userId: user,
    businessObjectId: interview,
    applicationId: application,
    interviewId: interview,
    now,
    gracePeriodMs: 0,
    escalationPeriodMs: 86_400_000,
  });
}

describe("deterministic durable workflow plans", () => {
  it("chases missing scorecards, then escalates without a consequential action", () => {
    const base: WorkflowSnapshot = {
      now,
      interviewStatus: "COMPLETED",
      interviewCompletedAt: now,
      requiredScorecards: 2,
      submittedScorecards: 1,
    };
    const reminder = buildWorkflowPlan(input("scorecard_chase"), base);
    expect(reminder.status).toBe("WAITING");
    expect(
      reminder.steps.some(
        (step) => step.kind === "action" && step.actionType === "send_scorecard_reminder",
      ),
    ).toBe(true);
    const escalated = buildWorkflowPlan(input("scorecard_chase"), { ...base, followUpAttempt: 1 });
    expect(escalated.status).toBe("BLOCKED");
    expect(escalated.steps.some((step) => step.kind === "exception")).toBe(true);
    expect(
      escalated.steps.some(
        (step) => step.kind === "action" && step.actionType === "send_status_update",
      ),
    ).toBe(false);
  });

  it("stops candidate follow-up immediately on response", () => {
    const plan = buildWorkflowPlan(input("candidate_follow_up"), {
      now,
      candidateResponded: true,
      activeObligationId: application,
    });
    expect(plan.status).toBe("COMPLETE");
    expect(plan.steps[0]?.kind).toBe("resolve_obligation");
  });

  it("requires human approval for scheduling and replacement", () => {
    const scheduling = buildWorkflowPlan(input("scheduling_resolution"), {
      now,
      declinedParticipantCount: 1,
    });
    const replacement = buildWorkflowPlan(input("interviewer_decline_replacement"), {
      now,
      declinedParticipantCount: 1,
    });
    expect(scheduling.steps[0]).toMatchObject({
      kind: "approval",
      actionType: "book_calendar_event",
    });
    expect(replacement.steps[0]).toMatchObject({
      kind: "approval",
      actionType: "request_interviewer_substitution",
    });
  });

  it("escalates only confirmed near-term offer deadlines", () => {
    const plan = buildWorkflowPlan(input("deadline_candidate_escalation"), {
      now,
      confirmedOfferDeadlineAt: new Date("2026-08-24T18:00:00.000Z"),
    });
    expect(plan.status).toBe("BLOCKED");
    expect(plan.steps[0]).toMatchObject({
      kind: "exception",
      severity: "CRITICAL",
      type: "COMPETING_OFFER_DEADLINE",
    });
  });
});
