/**
 * Durable deterministic workflows.
 *
 * PostgreSQL remains canonical truth. Workflow code only plans bounded,
 * retry-safe administrative work and calls the application boundary for every
 * material mutation. No model or hidden queue is involved.
 */
import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";
import {
  createException,
  createObligation,
  recordWorkflowAction,
  requestApproval,
  resolveObligation,
  type ApplicationContext,
} from "@recruiterpal/application";
import { permissionsForRoles, type ActorContext } from "@recruiterpal/domain";
import { schema, withTenant, type RecruiterPalDb } from "@recruiterpal/db";
import {
  normalizeWorkflowInput,
  type ParsedWorkflowInput,
  type WorkflowInput,
  type WorkflowPlan,
  type WorkflowPlanStep,
  type WorkflowResult,
  type WorkflowSnapshot,
} from "./workflow-input";

export { normalizeWorkflowInput, WORKFLOW_TYPES } from "./workflow-input";
export type { ParsedWorkflowInput, WorkflowInput, WorkflowPlan, WorkflowPlanStep, WorkflowResult, WorkflowSnapshot, WorkflowType } from "./workflow-input";

function addMs(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms);
}

function planScorecardChase(input: ParsedWorkflowInput, snapshot: WorkflowSnapshot): WorkflowPlan {
  const required = snapshot.requiredScorecards ?? 0;
  const submitted = snapshot.submittedScorecards ?? 0;
  if (snapshot.interviewStatus !== "COMPLETED" || submitted >= required) {
    return { status: "COMPLETE", nextWakeAt: null, steps: snapshot.activeObligationId ? [{ kind: "resolve_obligation", key: "resolve-scorecard-obligation", obligationId: snapshot.activeObligationId }] : [] };
  }
  const completedAt = snapshot.interviewCompletedAt ?? snapshot.now;
  const dueAt = snapshot.obligationDueAt ?? addMs(completedAt, input.gracePeriodMs);
  const steps: WorkflowPlanStep[] = [
    { kind: "obligation", key: "scorecard-obligation", obligationType: "SCORECARD_SUBMISSION", dueAt, summary: `${required - submitted} scorecard(s) remain after the interview.` },
  ];
  if (snapshot.now < dueAt) return { status: "WAITING", nextWakeAt: dueAt, steps };
  if ((snapshot.followUpAttempt ?? 0) < 1) {
    steps.push({ kind: "action", key: "scorecard-reminder-1", actionType: "send_scorecard_reminder", summary: "Send the first scorecard reminder." });
    return { status: "WAITING", nextWakeAt: addMs(snapshot.now, input.escalationPeriodMs), steps };
  }
  steps.push({ kind: "exception", key: "scorecard-escalation", type: "MISSING_SCORECARD", severity: "HIGH", title: "Required scorecard is overdue", detail: `${required - submitted} required scorecard(s) remain missing after the reminder.` });
  return { status: "BLOCKED", nextWakeAt: null, steps };
}

function planCandidateFollowUp(input: ParsedWorkflowInput, snapshot: WorkflowSnapshot): WorkflowPlan {
  if (snapshot.candidateResponded) {
    return { status: "COMPLETE", nextWakeAt: null, steps: snapshot.activeObligationId ? [{ kind: "resolve_obligation", key: "resolve-candidate-obligation", obligationId: snapshot.activeObligationId }] : [] };
  }
  const dueAt = snapshot.candidateFollowUpDueAt ?? addMs(snapshot.now, input.gracePeriodMs);
  const steps: WorkflowPlanStep[] = [{ kind: "obligation", key: "candidate-response-obligation", obligationType: "CANDIDATE_RESPONSE", dueAt, summary: "Candidate response is pending." }];
  if (snapshot.now < dueAt) return { status: "WAITING", nextWakeAt: dueAt, steps };
  const attempt = snapshot.followUpAttempt ?? 0;
  if (attempt < input.maxAttempts) {
    steps.push({ kind: "action", key: `candidate-follow-up-${attempt + 1}`, actionType: "send_candidate_follow_up", summary: `Send approved follow-up attempt ${attempt + 1}.` });
    return { status: "WAITING", nextWakeAt: addMs(snapshot.now, input.escalationPeriodMs), steps };
  }
  steps.push({ kind: "exception", key: "candidate-follow-up-escalation", type: "CANDIDATE_RESPONSE_OVERDUE", severity: "HIGH", title: "Candidate response is overdue", detail: "The approved follow-up limit was reached without a candidate response." });
  return { status: "BLOCKED", nextWakeAt: null, steps };
}

function planScheduling(snapshot: WorkflowSnapshot): WorkflowPlan {
  if ((snapshot.declinedParticipantCount ?? 0) === 0 && !snapshot.noFeasibleSlot) return { status: "COMPLETE", nextWakeAt: null, steps: [] };
  if (snapshot.noFeasibleSlot) {
    return {
      status: "BLOCKED",
      nextWakeAt: null,
      steps: [{ kind: "exception", key: "scheduling-no-feasible-slot", type: "SCHEDULING_CONFLICT", severity: "HIGH", title: "No feasible interview slot", detail: "Deterministic availability reconciliation found no valid slot within the current constraints." }],
    };
  }
  return {
    status: "WAITING",
    nextWakeAt: null,
    steps: [{ kind: "approval", key: "scheduling-booking-approval", actionType: "book_calendar_event", requiredPermission: "interview:write", rationale: "Approve the deterministic slot and notify the interview panel." }],
  };
}

function planReplacement(snapshot: WorkflowSnapshot): WorkflowPlan {
  if ((snapshot.declinedParticipantCount ?? 0) === 0) return { status: "COMPLETE", nextWakeAt: null, steps: [] };
  return {
    status: "WAITING",
    nextWakeAt: null,
    steps: [{ kind: "approval", key: "interviewer-replacement-approval", actionType: "request_interviewer_substitution", requiredPermission: "interview:write", rationale: "A required interviewer declined; approve a replacement from the approved pool." }],
  };
}

function planIntegration(snapshot: WorkflowSnapshot): WorkflowPlan {
  if (!snapshot.integrationDrift) return { status: "COMPLETE", nextWakeAt: null, steps: [] };
  return {
    status: "BLOCKED",
    nextWakeAt: null,
    steps: [{ kind: "exception", key: "integration-drift", type: "INTEGRATION_DRIFT", severity: "MEDIUM", title: "Integration reconciliation required", detail: "External and canonical state are stale or inconsistent; no external write was attempted." }],
  };
}

function planStaleExceptions(snapshot: WorkflowSnapshot): WorkflowPlan {
  if ((snapshot.staleExceptionCount ?? 0) === 0) return { status: "COMPLETE", nextWakeAt: null, steps: [] };
  return {
    status: "BLOCKED",
    nextWakeAt: null,
    steps: [{ kind: "exception", key: "stale-exception-reconciliation", type: "STALE_EXCEPTION_STATE", severity: "MEDIUM", title: "Exception state needs reconciliation", detail: `${snapshot.staleExceptionCount} open exception(s) have not been recomputed within the policy window.` }],
  };
}

function planDeadline(input: ParsedWorkflowInput, snapshot: WorkflowSnapshot): WorkflowPlan {
  const deadline = snapshot.confirmedOfferDeadlineAt;
  if (!deadline || deadline.getTime() > snapshot.now.getTime() + input.escalationPeriodMs) return { status: "COMPLETE", nextWakeAt: deadline ?? null, steps: [] };
  return {
    status: "BLOCKED",
    nextWakeAt: null,
    steps: [{ kind: "exception", key: "competing-offer-deadline", type: "COMPETING_OFFER_DEADLINE", severity: "CRITICAL", title: "Competing offer deadline is near", detail: "A confirmed candidate-stated deadline is within the escalation window. Human review remains required.", deadlineAt: deadline }],
  };
}

/** Pure planning surface used by the durable runner and fast unit tests. */
export function buildWorkflowPlan(input: ParsedWorkflowInput, snapshot: WorkflowSnapshot): WorkflowPlan {
  switch (input.workflowType) {
    case "scorecard_chase": return planScorecardChase(input, snapshot);
    case "candidate_follow_up": return planCandidateFollowUp(input, snapshot);
    case "scheduling_resolution": return planScheduling(snapshot);
    case "interviewer_decline_replacement": return planReplacement(snapshot);
    case "integration_reconciliation": return planIntegration(snapshot);
    case "stale_exception_reconciliation": return planStaleExceptions(snapshot);
    case "deadline_candidate_escalation": return planDeadline(input, snapshot);
  }
  throw new Error(`Unsupported workflow type: ${input.workflowType}`);
}

function workflowActor(input: ParsedWorkflowInput): ActorContext {
  const roles = ["admin"] as const;
  return { userId: input.userId, organizationId: input.organizationId, roles, permissions: permissionsForRoles(roles), origin: "workflow" };
}

function applicationContext(input: ParsedWorkflowInput): ApplicationContext {
  const actor = workflowActor(input);
  return { tenant: { organizationId: input.organizationId, userId: input.userId }, actor, correlationId: workflowKey(input) };
}

function workflowKey(input: ParsedWorkflowInput): string {
  return `${input.organizationId}:${input.workflowType}:${input.businessObjectId}`;
}

async function ensureWorkflowInstance(db: RecruiterPalDb, input: ParsedWorkflowInput): Promise<{ id: string; replayed: boolean }> {
  const ctx = { organizationId: input.organizationId, userId: input.userId };
  return withTenant(db, ctx, async (tx) => {
    const [inserted] = await tx
      .insert(schema.workflowInstances)
      .values({ organizationId: input.organizationId, workflowType: input.workflowType, businessObjectId: input.businessObjectId, status: "RUNNING" })
      .onConflictDoNothing({ target: [schema.workflowInstances.organizationId, schema.workflowInstances.workflowType, schema.workflowInstances.businessObjectId] })
      .returning({ id: schema.workflowInstances.id });
    if (inserted) return { id: inserted.id, replayed: false };
    const [existing] = await tx
      .select({ id: schema.workflowInstances.id })
      .from(schema.workflowInstances)
      .where(and(eq(schema.workflowInstances.organizationId, input.organizationId), eq(schema.workflowInstances.workflowType, input.workflowType), eq(schema.workflowInstances.businessObjectId, input.businessObjectId)))
      .limit(1);
    if (!existing) throw new Error("Workflow instance disappeared after idempotent insert.");
    return { id: existing.id, replayed: true };
  });
}

async function readSnapshot(db: RecruiterPalDb, input: ParsedWorkflowInput): Promise<WorkflowSnapshot> {
  const now = input.now ?? new Date();
  return withTenant(db, { organizationId: input.organizationId, userId: input.userId }, async (tx) => {
    const snapshot: WorkflowSnapshot = { now, applicationId: input.applicationId, interviewId: input.interviewId, jobId: input.jobId };
    const interviewId = input.interviewId ?? (input.workflowType === "scorecard_chase" ? input.businessObjectId : undefined);
    if (interviewId) {
      const [interview] = await tx.select().from(schema.interviews).where(and(eq(schema.interviews.id, interviewId), eq(schema.interviews.organizationId, input.organizationId))).limit(1);
      if (interview) {
        snapshot.interviewId = interview.id;
        snapshot.applicationId = snapshot.applicationId ?? interview.applicationId;
        snapshot.interviewStatus = interview.status;
        snapshot.interviewCompletedAt = interview.completedAt;
        snapshot.requiredScorecards = interview.requiresScorecardsFrom;
        snapshot.noFeasibleSlot = ["AWAITING_AVAILABILITY", "RESCHEDULE_REQUIRED"].includes(interview.status);
        const scorecards = await tx.select({ status: schema.scorecards.status }).from(schema.scorecards).where(and(eq(schema.scorecards.interviewId, interview.id), eq(schema.scorecards.organizationId, input.organizationId), inArray(schema.scorecards.status, ["SUBMITTED", "AMENDED"])));
        snapshot.submittedScorecards = scorecards.length;
      }
      const declined = await tx.select({ userId: schema.interviewParticipants.userId }).from(schema.interviewParticipants).where(and(eq(schema.interviewParticipants.interviewId, interviewId), eq(schema.interviewParticipants.organizationId, input.organizationId), eq(schema.interviewParticipants.declined, true))).limit(20);
      snapshot.declinedParticipantCount = declined.length;
    }
    if (snapshot.applicationId) {
      const [obligation] = await tx.select({ id: schema.applicationObligations.id, dueAt: schema.applicationObligations.dueAt }).from(schema.applicationObligations).where(and(eq(schema.applicationObligations.organizationId, input.organizationId), eq(schema.applicationObligations.applicationId, snapshot.applicationId), inArray(schema.applicationObligations.state, ["PENDING", "ESCALATED"]), inArray(schema.applicationObligations.obligationType, ["SCORECARD_SUBMISSION", "CANDIDATE_RESPONSE"]))).orderBy(schema.applicationObligations.dueAt).limit(1);
      snapshot.activeObligationId = obligation?.id;
      snapshot.obligationDueAt = obligation?.dueAt;
      snapshot.candidateFollowUpDueAt = obligation?.dueAt;
      const followUpActionType = input.workflowType === "scorecard_chase" ? "send_scorecard_reminder" : "send_candidate_follow_up";
      const followUps = await tx.select({ id: schema.actions.id }).from(schema.actions).where(and(eq(schema.actions.organizationId, input.organizationId), eq(schema.actions.actionType, followUpActionType), eq(schema.actions.status, "SUCCEEDED"), eq(schema.actions.targetRefs, [`application:${snapshot.applicationId}`])));
      snapshot.followUpAttempt = followUps.length;
      const inbound = await tx.select({ id: schema.messages.id }).from(schema.messages).innerJoin(schema.communicationThreads, eq(schema.communicationThreads.id, schema.messages.threadId)).where(and(eq(schema.communicationThreads.organizationId, input.organizationId), eq(schema.communicationThreads.applicationId, snapshot.applicationId), eq(schema.messages.direction, "INBOUND"))).limit(1);
      snapshot.candidateResponded = inbound.length > 0;
    }
    if (input.workflowType === "integration_reconciliation") {
      const cutoff = addMs(now, -input.staleAfterMs);
      const stale = await tx.select({ id: schema.integrationConnections.id }).from(schema.integrationConnections).where(and(eq(schema.integrationConnections.organizationId, input.organizationId), or(isNull(schema.integrationConnections.lastSyncedAt), lt(schema.integrationConnections.lastSyncedAt, cutoff)))).limit(1);
      snapshot.integrationDrift = stale.length > 0;
    }
    if (input.workflowType === "stale_exception_reconciliation") {
      const cutoff = addMs(now, -input.staleAfterMs);
      const stale = await tx.select({ id: schema.exceptions.id }).from(schema.exceptions).where(and(eq(schema.exceptions.organizationId, input.organizationId), inArray(schema.exceptions.status, ["OPEN", "ACKNOWLEDGED"]), or(isNull(schema.exceptions.lastRecomputedAt), lt(schema.exceptions.lastRecomputedAt, cutoff)))).limit(20);
      snapshot.staleExceptionCount = stale.length;
    }
    if (input.workflowType === "deadline_candidate_escalation" && snapshot.applicationId) {
      const [fact] = await tx.select({ normalizedValue: schema.extractedFacts.normalizedValue }).from(schema.extractedFacts).where(and(eq(schema.extractedFacts.organizationId, input.organizationId), eq(schema.extractedFacts.applicationId, snapshot.applicationId), eq(schema.extractedFacts.factType, "COMPETING_OFFER_DEADLINE"), eq(schema.extractedFacts.reviewState, "CONFIRMED"))).limit(1);
      const value = fact?.normalizedValue as { deadlineAt?: string } | null | undefined;
      snapshot.confirmedOfferDeadlineAt = value?.deadlineAt ? new Date(value.deadlineAt) : null;
    }
    return snapshot;
  });
}

async function syncWorkflowObligation(db: RecruiterPalDb, input: ParsedWorkflowInput, instanceId: string, step: Extract<WorkflowPlanStep, { kind: "obligation" }>): Promise<void> {
  await withTenant(db, { organizationId: input.organizationId, userId: input.userId }, async (tx) => {
    const obligationKey = `${workflowKey(input)}:${step.key}`;
    await tx.insert(schema.workflowObligations).values({ organizationId: input.organizationId, instanceId, obligationKey, summary: step.summary, state: "ACTIVE", visibleOnToday: true }).onConflictDoUpdate({ target: schema.workflowObligations.obligationKey, set: { state: "ACTIVE", summary: step.summary, visibleOnToday: true, updatedAt: new Date() } });
  });
}

async function finishWorkflow(db: RecruiterPalDb, input: ParsedWorkflowInput, instanceId: string, status: WorkflowPlan["status"]): Promise<void> {
  await withTenant(db, { organizationId: input.organizationId, userId: input.userId }, async (tx) => {
    await tx.update(schema.workflowInstances).set({ status: status === "COMPLETE" ? "COMPLETED" : "RUNNING", finishedAt: status === "COMPLETE" ? new Date() : null }).where(and(eq(schema.workflowInstances.id, instanceId), eq(schema.workflowInstances.organizationId, input.organizationId)));
    if (status === "COMPLETE") await tx.update(schema.workflowObligations).set({ state: "SATISFIED", visibleOnToday: false, updatedAt: new Date() }).where(and(eq(schema.workflowObligations.instanceId, instanceId), eq(schema.workflowObligations.organizationId, input.organizationId), eq(schema.workflowObligations.state, "ACTIVE")));
  });
}

async function applyPlan(db: RecruiterPalDb, input: ParsedWorkflowInput, instanceId: string, plan: WorkflowPlan): Promise<void> {
  const ctx = applicationContext(input);
  for (const step of plan.steps) {
    const key = `${workflowKey(input)}:${step.key}`;
    if (step.kind === "obligation") {
      await createObligation(db, ctx, { applicationId: input.applicationId ?? null, interviewId: input.interviewId ?? null, obligationType: step.obligationType, responsibleUserId: null, dueAt: step.dueAt, workflowRef: key, idempotencyKey: `${key}:application-obligation` });
      await syncWorkflowObligation(db, input, instanceId, step);
    } else if (step.kind === "resolve_obligation") {
      await resolveObligation(db, ctx, { obligationId: step.obligationId, idempotencyKey: `${key}:resolve` });
    } else if (step.kind === "action") {
      await recordWorkflowAction(db, ctx, { actionType: step.actionType, targetRefs: [input.applicationId ? `application:${input.applicationId}` : `workflow:${workflowKey(input)}`], parameters: { workflowType: input.workflowType, businessObjectId: input.businessObjectId, attempt: step.key }, rationale: step.summary, idempotencyKey: key, outcome: { delivered: false, synthetic: true, reason: "Adapter boundary records intent; live provider is qualified separately." } });
    } else if (step.kind === "exception") {
      await createException(db, ctx, { type: step.type, jobId: input.jobId ?? null, applicationId: input.applicationId ?? null, interviewId: input.interviewId ?? null, scopeKey: key, severity: step.severity, title: step.title, detail: step.detail, deadlineAt: step.deadlineAt ?? null, idempotencyKey: `${key}:exception` });
    } else if (step.kind === "approval") {
      await requestApproval(db, ctx, { actionType: step.actionType, targetRefs: [input.interviewId ? `interview:${input.interviewId}` : `workflow:${workflowKey(input)}`], parameters: { workflowType: input.workflowType, businessObjectId: input.businessObjectId }, rationale: step.rationale, evidenceRefs: [], requiredPermission: step.requiredPermission, expiresAt: null, idempotencyKey: `${key}:approval` });
    }
  }
}

/** Execute one deterministic workflow tick. Safe to call again after a crash. */
export async function executeWorkflow(db: RecruiterPalDb, rawInput: WorkflowInput): Promise<WorkflowResult> {
  const input = normalizeWorkflowInput(rawInput);
  const instance = await ensureWorkflowInstance(db, input);
  const snapshot = await readSnapshot(db, input);
  const plan = buildWorkflowPlan(input, snapshot);
  await applyPlan(db, input, instance.id, plan);
  await finishWorkflow(db, input, instance.id, plan.status);
  return { workflowType: input.workflowType, workflowInstanceId: instance.id, status: plan.status, replayed: instance.replayed || plan.steps.length === 0, stepKeys: plan.steps.map((step) => step.key), nextWakeAt: plan.nextWakeAt };
}

export * from "./entrypoints";
