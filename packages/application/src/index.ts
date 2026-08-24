/**
 * Deterministic application boundary.
 *
 * This is the only layer allowed to turn an authenticated intent into a
 * recruiting mutation. It owns tenant context, protocol freshness, state
 * transitions, idempotency, approvals, readiness snapshots, and the audit /
 * domain-event pair. Agents and workflows call this boundary; they never
 * receive a database client.
 */
import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import {
  ACTION_TYPES,
  APPLICATION_STATUSES,
  AUTOMATION_POLICY_VERSION,
  PERMISSIONS,
  assertHumanAuthority,
  assertPermission,
  assertScorecardTransition,
  assertStageTransition,
  authorityFor,
  buildExceptionKey,
  computeDecisionReadiness,
  detectMaterialConflicts,
  type ActionType,
  type ActorContext,
  type AuthorityClass,
  type DecisionReadinessResult,
  type ExceptionSeverity,
} from "@recruiterpal/domain";
import {
  writeAudit,
  writeDomainEvent,
  withTenant,
  type RecruiterPalDb,
  type TenantContext,
  type TenantTx,
} from "@recruiterpal/db";
import * as s from "@recruiterpal/db/schema";

const POLICY_VERSION = AUTOMATION_POLICY_VERSION;

export interface ApplicationContext {
  readonly tenant: TenantContext;
  readonly actor: ActorContext;
  readonly correlationId?: string;
}

export class ApplicationInvariantError extends Error {
  constructor(
    public readonly code:
      | "CONTEXT_MISMATCH"
      | "NOT_FOUND"
      | "STALE_PROTOCOL"
      | "STALE_STATE"
      | "FORBIDDEN"
      | "VALIDATION_ERROR"
      | "IDEMPOTENCY_CONFLICT"
      | "APPROVAL_REQUIRED"
      | "READINESS_BLOCKED",
    message: string,
  ) {
    super(message);
    this.name = "ApplicationInvariantError";
  }
}

const uuid = z.string().uuid();
const idempotencyKey = z.string().trim().min(1).max(280);

export const transitionApplicationInputSchema = z.object({
  applicationId: uuid,
  protocolVersionId: uuid,
  toStage: z.string().trim().min(1).max(80),
  expectedFromStage: z.string().trim().min(1).max(80).optional(),
  reason: z.string().trim().max(1000).optional(),
  approvalId: uuid.optional(),
  idempotencyKey,
});
export type TransitionApplicationInput = z.infer<typeof transitionApplicationInputSchema>;

const ratingInputSchema = z.object({
  competencyId: uuid,
  rating: z.number().int().min(1).max(5),
  evidenceNote: z.string().trim().min(1).max(5000),
  rubricAnchor: z.string().trim().max(200).optional(),
});

export const submitScorecardInputSchema = z.object({
  scorecardId: uuid,
  protocolVersionId: uuid,
  ratings: z.array(ratingInputSchema).min(1),
  amend: z.boolean().default(false),
  idempotencyKey,
});
export type SubmitScorecardInput = z.infer<typeof submitScorecardInputSchema>;

export const openScorecardInputSchema = z.object({
  scorecardId: uuid,
  protocolVersionId: uuid,
  idempotencyKey,
});
export type OpenScorecardInput = z.infer<typeof openScorecardInputSchema>;

export const createExceptionInputSchema = z.object({
  type: z.string().trim().min(1).max(60),
  jobId: uuid.nullable().default(null),
  applicationId: uuid.nullable().default(null),
  interviewId: uuid.nullable().default(null),
  scopeKey: z.string().trim().min(1).max(200),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  title: z.string().trim().min(1).max(300),
  detail: z.string().trim().min(1).max(10000),
  deadlineAt: z.coerce.date().nullable().default(null),
  idempotencyKey,
});
export type CreateExceptionInput = z.infer<typeof createExceptionInputSchema>;

export const resolveExceptionInputSchema = z.object({
  exceptionId: uuid,
  reason: z.string().trim().min(1).max(2000),
  idempotencyKey,
});
export type ResolveExceptionInput = z.infer<typeof resolveExceptionInputSchema>;

export const createObligationInputSchema = z.object({
  applicationId: uuid.nullable().default(null),
  interviewId: uuid.nullable().default(null),
  obligationType: z.string().trim().min(1).max(80),
  responsibleUserId: uuid.nullable().default(null),
  dueAt: z.coerce.date(),
  workflowRef: z.string().trim().max(255).nullable().default(null),
  idempotencyKey,
});
export type CreateObligationInput = z.infer<typeof createObligationInputSchema>;

export const resolveObligationInputSchema = z.object({
  obligationId: uuid,
  idempotencyKey,
});
export type ResolveObligationInput = z.infer<typeof resolveObligationInputSchema>;

export const requestApprovalInputSchema = z.object({
  actionType: z.enum(ACTION_TYPES),
  targetRefs: z.array(z.string().min(1)).min(1),
  parameters: z.record(z.string(), z.unknown()).default({}),
  rationale: z.string().trim().min(1).max(5000),
  evidenceRefs: z.array(z.string()).default([]),
  requiredPermission: z.string().trim().min(1).max(80),
  expiresAt: z.coerce.date().nullable().default(null),
  idempotencyKey,
});
export type RequestApprovalInput = z.infer<typeof requestApprovalInputSchema>;

export const decideApprovalInputSchema = z.object({
  approvalId: uuid,
  decision: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().trim().min(1).max(2000),
  idempotencyKey,
});
export type DecideApprovalInput = z.infer<typeof decideApprovalInputSchema>;

export const proposeActionInputSchema = z.object({
  actionType: z.enum(ACTION_TYPES),
  targetRefs: z.array(z.string().min(1)).min(1),
  parameters: z.record(z.string(), z.unknown()).default({}),
  rationale: z.string().trim().min(1).max(5000),
  evidenceRefs: z.array(z.string()).default([]),
  requestedAuthorityClass: z.enum(["A0", "A1", "A2", "A3"]).optional(),
  createdByAgentSessionId: z.string().trim().max(255).nullable().default(null),
  expiresAt: z.coerce.date().nullable().default(null),
  idempotencyKey,
});
export type ProposeActionInput = z.infer<typeof proposeActionInputSchema>;

export const recordDecisionInputSchema = z.object({
  applicationId: uuid,
  protocolVersionId: uuid,
  decision: z.enum(["HIRE", "REJECT", "ADVANCE", "HOLD"]),
  rationale: z.string().trim().min(1).max(5000),
  idempotencyKey,
});
export type RecordDecisionInput = z.infer<typeof recordDecisionInputSchema>;

type ActionRow = typeof s.actions.$inferSelect;
type ApprovalRow = typeof s.approvals.$inferSelect;
type ApplicationRow = typeof s.applications.$inferSelect;
type ExceptionRow = typeof s.exceptions.$inferSelect;
type ObligationRow = typeof s.applicationObligations.$inferSelect;

export interface MutationResult<T> {
  readonly value: T;
  readonly actionId: string;
  readonly replayed: boolean;
}

export interface ReadinessSnapshotResult {
  readonly snapshotId: string;
  readonly result: DecisionReadinessResult;
}

function actorType(actor: ActorContext): "HUMAN" | "AGENT" | "WORKFLOW" | "INTEGRATION" {
  return actor.origin.toUpperCase() as "HUMAN" | "AGENT" | "WORKFLOW" | "INTEGRATION";
}

function assertContext(ctx: ApplicationContext): void {
  if (
    ctx.actor.organizationId !== ctx.tenant.organizationId ||
    ctx.actor.userId !== ctx.tenant.userId
  ) {
    throw new ApplicationInvariantError(
      "CONTEXT_MISMATCH",
      "Actor and tenant context must identify the same organization and user.",
    );
  }
}

function denyAgentMutation(actor: ActorContext, message: string): void {
  if (actor.origin === "agent") {
    throw new ApplicationInvariantError("FORBIDDEN", message);
  }
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(",")}}`;
}

function canonicalKey(ctx: ApplicationContext, key: string): string {
  return `${ctx.tenant.organizationId}:${key}`;
}

async function getApplication(
  tx: TenantTx,
  ctx: ApplicationContext,
  applicationId: string,
): Promise<ApplicationRow> {
  const [application] = await tx
    .select()
    .from(s.applications)
    .where(
      and(
        eq(s.applications.id, applicationId),
        eq(s.applications.organizationId, ctx.tenant.organizationId),
      ),
    )
    .limit(1);
  if (!application) {
    throw new ApplicationInvariantError("NOT_FOUND", "Application was not found in this organization.");
  }
  return application;
}

async function getProtocol(
  tx: TenantTx,
  ctx: ApplicationContext,
  application: ApplicationRow,
  protocolVersionId: string,
) {
  if (application.protocolVersionId !== protocolVersionId) {
    throw new ApplicationInvariantError(
      "STALE_PROTOCOL",
      "The mutation protocol version does not match the application protocol version.",
    );
  }
  const [protocol] = await tx
    .select()
    .from(s.hiringProtocolVersions)
    .where(
      and(
        eq(s.hiringProtocolVersions.id, protocolVersionId),
        eq(s.hiringProtocolVersions.organizationId, ctx.tenant.organizationId),
      ),
    )
    .limit(1);
  if (!protocol) {
    throw new ApplicationInvariantError("NOT_FOUND", "Protocol version was not found in this organization.");
  }
  if (protocol.status !== "APPROVED") {
    throw new ApplicationInvariantError("STALE_PROTOCOL", "Only an approved protocol version may mutate an application.");
  }
  return protocol;
}

async function startAction(
  tx: TenantTx,
  ctx: ApplicationContext,
  input: {
    actionType: ActionType;
    targetRefs: string[];
    parameters: Record<string, unknown>;
    rationale: string;
    evidenceRefs?: string[];
    idempotencyKey: string;
    createdByAgentSessionId?: string | null;
    expiresAt?: Date | null;
    status?: "PROPOSED" | "AUTHORIZED_AUTOMATIC" | "AWAITING_APPROVAL" | "EXECUTING";
  },
): Promise<{ action: ActionRow; replayed: boolean }> {
  const key = canonicalKey(ctx, input.idempotencyKey);
  const [existing] = await tx
    .select()
    .from(s.actions)
    .where(
      and(
        eq(s.actions.organizationId, ctx.tenant.organizationId),
        eq(s.actions.idempotencyKey, key),
      ),
    )
    .limit(1);
  if (existing) {
    if (stableJson(existing.parameters) !== stableJson(input.parameters)) {
      throw new ApplicationInvariantError(
        "IDEMPOTENCY_CONFLICT",
        "The idempotency key was already used with different parameters.",
      );
    }
    return { action: existing, replayed: true };
  }

  const authority = authorityFor(input.actionType);
  const [inserted] = await tx
    .insert(s.actions)
    .values({
      organizationId: ctx.tenant.organizationId,
      actionType: input.actionType,
      targetRefs: input.targetRefs,
      parameters: input.parameters,
      rationale: input.rationale,
      evidenceRefs: input.evidenceRefs ?? [],
      requestedAuthorityClass: authority,
      resolvedAuthorityClass: authority,
      status:
        input.status ??
        (authority === "A1"
          ? "AUTHORIZED_AUTOMATIC"
          : authority === "A2"
            ? "AWAITING_APPROVAL"
            : "PROPOSED"),
      createdByAgentSessionId: input.createdByAgentSessionId ?? null,
      createdByUserId: ctx.actor.origin === "human" ? ctx.actor.userId : null,
      idempotencyKey: key,
      expiresAt: input.expiresAt ?? null,
    })
    .onConflictDoNothing({ target: s.actions.idempotencyKey })
    .returning();
  if (inserted) return { action: inserted, replayed: false };

  const [raced] = await tx
    .select()
    .from(s.actions)
    .where(eq(s.actions.idempotencyKey, key))
    .limit(1);
  if (!raced) throw new ApplicationInvariantError("STALE_STATE", "The idempotent action could not be read after insertion.");
  return { action: raced, replayed: true };
}

async function completeAction(
  tx: TenantTx,
  actionId: string,
  outcome: Record<string, unknown>,
): Promise<void> {
  await tx
    .update(s.actions)
    .set({ status: "SUCCEEDED", executionOutcome: outcome, updatedAt: new Date() })
    .where(eq(s.actions.id, actionId));
}

async function approvedAction(
  tx: TenantTx,
  ctx: ApplicationContext,
  approvalId: string,
  actionType: ActionType,
  applicationId: string,
): Promise<ActionRow> {
  const [approval] = await tx
    .select()
    .from(s.approvals)
    .where(
      and(
        eq(s.approvals.id, approvalId),
        eq(s.approvals.organizationId, ctx.tenant.organizationId),
      ),
    )
    .limit(1);
  if (!approval || approval.status !== "APPROVED" || !approval.actionId) {
    throw new ApplicationInvariantError("APPROVAL_REQUIRED", "An approved human authorization is required.");
  }
  const [action] = await tx
    .select()
    .from(s.actions)
    .where(
      and(
        eq(s.actions.id, approval.actionId),
        eq(s.actions.organizationId, ctx.tenant.organizationId),
      ),
    )
    .limit(1);
  if (!action || action.actionType !== actionType) {
    throw new ApplicationInvariantError("APPROVAL_REQUIRED", "The approval does not authorize this action.");
  }
  if (!action.targetRefs.includes(`application:${applicationId}`)) {
    throw new ApplicationInvariantError("APPROVAL_REQUIRED", "The approval target does not match the application.");
  }
  return action;
}

async function persistReadiness(
  tx: TenantTx,
  ctx: ApplicationContext,
  application: ApplicationRow,
  protocol: Awaited<ReturnType<typeof getProtocol>>,
): Promise<ReadinessSnapshotResult> {
  const stageEvents = await tx
    .select({ toStage: s.applicationStageEvents.toStage })
    .from(s.applicationStageEvents)
    .where(
      and(
        eq(s.applicationStageEvents.applicationId, application.id),
        eq(s.applicationStageEvents.organizationId, ctx.tenant.organizationId),
      ),
    );
  const interviews = await tx
    .select()
    .from(s.interviews)
    .where(
      and(
        eq(s.interviews.applicationId, application.id),
        eq(s.interviews.organizationId, ctx.tenant.organizationId),
      ),
    );
  const scorecards = await tx
    .select()
    .from(s.scorecards)
    .where(
      and(
        eq(s.scorecards.applicationId, application.id),
        eq(s.scorecards.organizationId, ctx.tenant.organizationId),
      ),
    );
  const protocolCompetencies = await tx
    .select()
    .from(s.protocolCompetencies)
    .where(
      and(
        eq(s.protocolCompetencies.protocolVersionId, protocol.id),
        eq(s.protocolCompetencies.organizationId, ctx.tenant.organizationId),
        eq(s.protocolCompetencies.isRequired, true),
      ),
    );
  const evidence = await tx
    .select()
    .from(s.evidenceObservations)
    .where(
      and(
        eq(s.evidenceObservations.applicationId, application.id),
        eq(s.evidenceObservations.organizationId, ctx.tenant.organizationId),
      ),
    );
  const ratingRows = await tx
    .select({
      scorecardId: s.scorecardRatings.scorecardId,
      raterId: s.scorecards.raterUserId,
      competencyId: s.scorecardRatings.competencyId,
      competencyName: s.competencies.name,
      rating: s.scorecardRatings.rating,
    })
    .from(s.scorecardRatings)
    .innerJoin(s.scorecards, eq(s.scorecards.id, s.scorecardRatings.scorecardId))
    .innerJoin(s.competencies, eq(s.competencies.id, s.scorecardRatings.competencyId))
    .where(
      and(
        eq(s.scorecardRatings.organizationId, ctx.tenant.organizationId),
        eq(s.scorecards.applicationId, application.id),
        inArray(s.scorecards.status, ["SUBMITTED", "AMENDED"]),
      ),
    );
  const pendingApprovals = await tx
    .select({ requiredPermission: s.approvals.requiredPermission, parameters: s.actions.parameters })
    .from(s.approvals)
    .leftJoin(s.actions, eq(s.actions.id, s.approvals.actionId))
    .where(
      and(
        eq(s.approvals.organizationId, ctx.tenant.organizationId),
        eq(s.approvals.status, "PENDING"),
      ),
    );

  const visitedStages = new Set(stageEvents.map((event) => event.toStage));
  visitedStages.add(application.currentStage);
  const requiredStages = protocol.stages.filter((stage) => stage.required).map((stage) => stage.name);
  const incompleteStageNames = requiredStages.filter((stage) => !visitedStages.has(stage));
  let missingScorecardCount = 0;
  for (const interview of interviews) {
    if (interview.status !== "COMPLETED") continue;
    const submitted = scorecards.filter(
      (scorecard) =>
        scorecard.interviewId === interview.id &&
        (scorecard.status === "SUBMITTED" || scorecard.status === "AMENDED"),
    ).length;
    missingScorecardCount += Math.max(0, interview.requiresScorecardsFrom - submitted);
  }

  const validEvidence = new Set(
    evidence
      .filter((item) => item.protocolVersionId === protocol.id && item.observation.trim().length > 0)
      .map((item) => item.competencyId),
  );
  for (const scorecard of scorecards) {
    if (scorecard.protocolVersionId !== protocol.id) continue;
    if (scorecard.status !== "SUBMITTED" && scorecard.status !== "AMENDED") continue;
    const rows = await tx
      .select({ competencyId: s.scorecardRatings.competencyId, evidenceNote: s.scorecardRatings.evidenceNote })
      .from(s.scorecardRatings)
      .where(eq(s.scorecardRatings.scorecardId, scorecard.id));
    for (const row of rows) if (row.evidenceNote?.trim()) validEvidence.add(row.competencyId);
  }
  const competenciesMissingEvidence = protocolCompetencies
    .filter((competency) => !validEvidence.has(competency.competencyId))
    .map((competency) => competency.competencyId);

  const staleProtocolEvidenceCount = evidence.filter(
    (item) => item.protocolVersionId !== protocol.id,
  ).length;
  const requiredLevels = new Map(
    protocolCompetencies.map((competency) => [competency.competencyId, competency.requiredLevel]),
  );
  const groupedRatings = new Map<string, typeof ratingRows>();
  for (const row of ratingRows) {
    const list = groupedRatings.get(row.competencyId) ?? [];
    list.push(row);
    groupedRatings.set(row.competencyId, list);
  }
  const materialConflicts = [];
  for (const [competencyId, rows] of groupedRatings) {
    const requiredLevel = requiredLevels.get(competencyId);
    if (requiredLevel === undefined) continue;
    materialConflicts.push(
      ...detectMaterialConflicts({
        requiredLevel,
        ratings: rows.map((row) => ({
          scorecardId: row.scorecardId,
          raterId: row.raterId,
          competencyName: row.competencyName,
          rating: row.rating,
        })),
      }),
    );
  }

  const missingApprovals = pendingApprovals
    .filter((approval) => {
      const parameters = approval.parameters as Record<string, unknown> | null;
      return parameters?.applicationId === application.id;
    })
    .map((approval) => approval.requiredPermission);

  const result = computeDecisionReadiness({
    applicationStatus: application.status as (typeof APPLICATION_STATUSES)[number],
    requiredStagesComplete: incompleteStageNames.length === 0,
    incompleteStageNames,
    missingScorecardCount,
    competenciesMissingEvidence,
    staleProtocolEvidenceCount,
    materialConflicts,
    missingApprovals,
  });
  const [snapshot] = await tx
    .insert(s.decisionReadinessSnapshots)
    .values({
      organizationId: ctx.tenant.organizationId,
      applicationId: application.id,
      status: result.status,
      reasons: [...result.reasons],
      missingEvidence: [...result.missingEvidence],
      conflicts: result.conflicts.map((conflict) => ({
        competency: conflict.competency,
        description: conflict.description,
      })),
      missingApprovals: [...result.missingApprovals],
      staleProtocolFlags: [...result.staleProtocolFlags],
      rulesetVersion: protocol.decisionReadinessRulesetVersion,
      computedByWorkflowRef: ctx.actor.origin === "workflow" ? ctx.actor.sessionId ?? null : null,
    })
    .returning({ id: s.decisionReadinessSnapshots.id });
  const snapshotId = snapshot!.id;
  await writeDomainEvent(tx, ctx.tenant, {
    eventType: "decision_readiness.recomputed",
    aggregateType: "application",
    aggregateId: application.id,
    payload: { snapshotId, status: result.status, reasons: result.reasons },
    actorType: actorType(ctx.actor),
    actorId: ctx.actor.userId,
    correlationId: ctx.correlationId,
  });
  await writeAudit(tx, ctx.tenant, {
    actorType: actorType(ctx.actor),
    actorId: ctx.actor.userId,
    actionType: "decision_readiness_recomputed",
    targetType: "application",
    targetId: application.id,
    authorityClass: "A1",
    policyVersion: protocol.decisionReadinessRulesetVersion,
    afterState: { snapshotId, status: result.status },
    outcome: "SUCCEEDED",
    correlationId: ctx.correlationId,
  });
  return { snapshotId, result };
}

export async function transitionApplication(
  db: RecruiterPalDb,
  ctx: ApplicationContext,
  rawInput: TransitionApplicationInput,
): Promise<MutationResult<{ applicationId: string; status: string; currentStage: string }>> {
  assertContext(ctx);
  const input = transitionApplicationInputSchema.parse(rawInput);
  return withTenant(db, ctx.tenant, async (tx) => {
    const application = await getApplication(tx, ctx, input.applicationId);
    const protocol = await getProtocol(tx, ctx, application, input.protocolVersionId);
    const terminal = input.toStage === "REJECTED" || input.toStage === "HIRED";
    const actionType: ActionType =
      input.toStage === "REJECTED"
        ? "reject_candidate"
        : input.toStage === "HIRED"
          ? "hire_candidate"
          : "execute_stage_transition";
    const [replayAction] = await tx
      .select()
      .from(s.actions)
      .where(eq(s.actions.idempotencyKey, canonicalKey(ctx, input.idempotencyKey)))
      .limit(1);
    if (replayAction?.status === "SUCCEEDED") {
      return {
        value: replayAction.executionOutcome as { applicationId: string; status: string; currentStage: string },
        actionId: replayAction.id,
        replayed: true,
      };
    }
    const fromStage = input.expectedFromStage ?? application.currentStage;
    if (fromStage !== application.currentStage) {
      throw new ApplicationInvariantError("STALE_STATE", "The application changed before this transition was applied.");
    }
    const stageGraph: Record<string, readonly string[]> = {};
    for (const [index, stage] of protocol.stages.entries()) {
      const next = protocol.stages[index + 1]?.name;
      stageGraph[stage.name] = next
        ? [next, "REJECTED", "WITHDRAWN"]
        : ["REJECTED", "WITHDRAWN"];
    }
    assertStageTransition(stageGraph, fromStage, input.toStage);
    let action: ActionRow;
    let replayed = false;
    if (terminal) {
      assertHumanAuthority(ctx.actor, PERMISSIONS.DECIDE_TERMINAL);
      const started = await startAction(tx, ctx, {
        actionType,
        targetRefs: [`application:${application.id}`],
        parameters: { fromStage, toStage: input.toStage, protocolVersionId: input.protocolVersionId },
        rationale: input.reason ?? `Human decision moved application to ${input.toStage}.`,
        idempotencyKey: input.idempotencyKey,
        status: "EXECUTING",
      });
      action = started.action;
      replayed = started.replayed;
    } else {
      assertPermission(ctx.actor, PERMISSIONS.APPLICATION_WRITE);
      denyAgentMutation(ctx.actor, "Agents may propose stage transitions but may not execute them.");
      if (!input.approvalId) {
        throw new ApplicationInvariantError("APPROVAL_REQUIRED", "An approved authorization is required for an operational stage transition.");
      }
      const approvalAction = await approvedAction(
        tx,
        ctx,
        input.approvalId,
        "execute_stage_transition",
        application.id,
      );
      const approvedParameters = approvalAction.parameters as Record<string, unknown>;
      if (
        approvedParameters.toStage !== input.toStage ||
        approvedParameters.protocolVersionId !== input.protocolVersionId
      ) {
        throw new ApplicationInvariantError("APPROVAL_REQUIRED", "The approval parameters do not match this transition.");
      }
      const started = await startAction(tx, ctx, {
        actionType: "execute_stage_transition",
        targetRefs: [`application:${application.id}`],
        parameters: { fromStage, toStage: input.toStage, protocolVersionId: input.protocolVersionId },
        rationale: input.reason ?? "Execute the approved operational stage transition.",
        idempotencyKey: input.idempotencyKey,
        status: "EXECUTING",
      });
      action = started.action;
      replayed = started.replayed;
    }
    if (replayed && action.status === "SUCCEEDED") {
      return {
        value: action.executionOutcome as { applicationId: string; status: string; currentStage: string },
        actionId: action.id,
        replayed: true,
      };
    }

    const status =
      input.toStage === "REJECTED"
        ? "REJECTED"
        : input.toStage === "HIRED"
          ? "HIRED"
          : input.toStage === "WITHDRAWN"
            ? "WITHDRAWN"
            : application.status;
    const now = new Date();
    await tx
      .update(s.applications)
      .set({ currentStage: input.toStage, status, lastActivityAt: now, updatedAt: now })
      .where(
        and(
          eq(s.applications.id, application.id),
          eq(s.applications.organizationId, ctx.tenant.organizationId),
          eq(s.applications.currentStage, fromStage),
        ),
      );
    await tx.insert(s.applicationStageEvents).values({
      organizationId: ctx.tenant.organizationId,
      applicationId: application.id,
      fromStage,
      toStage: input.toStage,
      reason: input.reason ?? null,
      actorType: actorType(ctx.actor),
      actorUserId: ctx.actor.origin === "human" ? ctx.actor.userId : null,
      humanAuthorityRecordRef: terminal ? action.id : input.approvalId ?? null,
      protocolVersionId: input.protocolVersionId,
      occurredAt: now,
    });
    const outcome = { applicationId: application.id, status, currentStage: input.toStage };
    await writeDomainEvent(tx, ctx.tenant, {
      eventType: "application.stage_transitioned",
      aggregateType: "application",
      aggregateId: application.id,
      payload: { fromStage, toStage: input.toStage, status, protocolVersionId: input.protocolVersionId },
      actorType: actorType(ctx.actor),
      actorId: ctx.actor.userId,
      correlationId: ctx.correlationId,
    });
    await writeAudit(tx, ctx.tenant, {
      actorType: actorType(ctx.actor),
      actorId: ctx.actor.userId,
      actionType,
      targetType: "application",
      targetId: application.id,
      authorityClass: authorityFor(actionType),
      policyVersion: POLICY_VERSION,
      approvalRef: input.approvalId ?? (terminal ? action.id : null),
      beforeState: { status: application.status, currentStage: application.currentStage },
      afterState: outcome,
      outcome: "SUCCEEDED",
      correlationId: ctx.correlationId,
    });
    await completeAction(tx, action.id, outcome);
    return { value: outcome, actionId: action.id, replayed: false };
  });
}

export async function openScorecard(
  db: RecruiterPalDb,
  ctx: ApplicationContext,
  rawInput: OpenScorecardInput,
): Promise<MutationResult<{ scorecardId: string; status: string }>> {
  assertContext(ctx);
  const input = openScorecardInputSchema.parse(rawInput);
  return withTenant(db, ctx.tenant, async (tx) => {
    const [scorecard] = await tx
      .select()
      .from(s.scorecards)
      .where(and(eq(s.scorecards.id, input.scorecardId), eq(s.scorecards.organizationId, ctx.tenant.organizationId)))
      .limit(1);
    if (!scorecard) throw new ApplicationInvariantError("NOT_FOUND", "Scorecard was not found in this organization.");
    const application = await getApplication(tx, ctx, scorecard.applicationId);
    await getProtocol(tx, ctx, application, input.protocolVersionId);
    if (scorecard.protocolVersionId !== input.protocolVersionId) throw new ApplicationInvariantError("STALE_PROTOCOL", "Scorecard protocol version is stale.");
    if (scorecard.raterUserId !== ctx.actor.userId) throw new ApplicationInvariantError("FORBIDDEN", "Only the assigned rater may open this scorecard.");
    assertPermission(ctx.actor, PERMISSIONS.SCORECARD_SUBMIT);
    denyAgentMutation(ctx.actor, "Agents may prepare scorecard work but may not open or mutate scorecards.");
    if (scorecard.status === "OPEN") return { value: { scorecardId: scorecard.id, status: scorecard.status }, actionId: "", replayed: true };
    assertScorecardTransition(scorecard.status as "NOT_OPEN" | "OPEN" | "SUBMITTED" | "AMENDED", "OPEN");
    const started = await startAction(tx, ctx, {
      actionType: "open_scorecard",
      targetRefs: [`scorecard:${scorecard.id}`],
      parameters: { scorecardId: scorecard.id, protocolVersionId: input.protocolVersionId },
      rationale: "Open the assigned scorecard for evidence capture.",
      idempotencyKey: input.idempotencyKey,
      status: "EXECUTING",
    });
    if (started.replayed && started.action.status === "SUCCEEDED") {
      return { value: started.action.executionOutcome as { scorecardId: string; status: string }, actionId: started.action.id, replayed: true };
    }
    const now = new Date();
    await tx.update(s.scorecards).set({ status: "OPEN", openedAt: now, updatedAt: now }).where(eq(s.scorecards.id, scorecard.id));
    const value = { scorecardId: scorecard.id, status: "OPEN" };
    await writeDomainEvent(tx, ctx.tenant, {
      eventType: "scorecard.opened",
      aggregateType: "scorecard",
      aggregateId: scorecard.id,
      payload: { protocolVersionId: input.protocolVersionId },
      actorType: actorType(ctx.actor),
      actorId: ctx.actor.userId,
      correlationId: ctx.correlationId,
    });
    await writeAudit(tx, ctx.tenant, {
      actorType: actorType(ctx.actor),
      actorId: ctx.actor.userId,
      actionType: "open_scorecard",
      targetType: "scorecard",
      targetId: scorecard.id,
      authorityClass: "A1",
      policyVersion: POLICY_VERSION,
      beforeState: { status: scorecard.status },
      afterState: value,
      outcome: "SUCCEEDED",
      correlationId: ctx.correlationId,
    });
    await completeAction(tx, started.action.id, value);
    return { value, actionId: started.action.id, replayed: false };
  });
}

export async function submitScorecard(
  db: RecruiterPalDb,
  ctx: ApplicationContext,
  rawInput: SubmitScorecardInput,
): Promise<MutationResult<ReadinessSnapshotResult & { scorecardId: string; status: string }>> {
  assertContext(ctx);
  const input = submitScorecardInputSchema.parse(rawInput);
  return withTenant(db, ctx.tenant, async (tx) => {
    const [scorecard] = await tx
      .select()
      .from(s.scorecards)
      .where(and(eq(s.scorecards.id, input.scorecardId), eq(s.scorecards.organizationId, ctx.tenant.organizationId)))
      .limit(1);
    if (!scorecard) throw new ApplicationInvariantError("NOT_FOUND", "Scorecard was not found in this organization.");
    const application = await getApplication(tx, ctx, scorecard.applicationId);
    const protocol = await getProtocol(tx, ctx, application, input.protocolVersionId);
    if (scorecard.protocolVersionId !== input.protocolVersionId) throw new ApplicationInvariantError("STALE_PROTOCOL", "Scorecard protocol version is stale.");
    if (scorecard.raterUserId !== ctx.actor.userId) throw new ApplicationInvariantError("FORBIDDEN", "Only the assigned rater may submit this scorecard.");
    assertPermission(ctx.actor, PERMISSIONS.SCORECARD_SUBMIT);
    denyAgentMutation(ctx.actor, "Agents may propose scorecard follow-up but may not submit evidence.");
    const targetStatus = input.amend ? "AMENDED" : "SUBMITTED";
    assertScorecardTransition(scorecard.status as "NOT_OPEN" | "OPEN" | "SUBMITTED" | "AMENDED", targetStatus);
    const required = await tx
      .select()
      .from(s.protocolCompetencies)
      .where(
        and(
          eq(s.protocolCompetencies.protocolVersionId, protocol.id),
          eq(s.protocolCompetencies.organizationId, ctx.tenant.organizationId),
          eq(s.protocolCompetencies.isRequired, true),
        ),
      );
    const supplied = new Map(input.ratings.map((rating) => [rating.competencyId, rating]));
    if (supplied.size !== input.ratings.length) throw new ApplicationInvariantError("VALIDATION_ERROR", "A scorecard cannot contain duplicate competency ratings.");
    const missing = required.filter((competency) => !supplied.has(competency.competencyId));
    if (missing.length > 0) throw new ApplicationInvariantError("VALIDATION_ERROR", `Missing required competency ratings: ${missing.map((item) => item.competencyId).join(", ")}.`);
    const allowed = new Set(required.map((item) => item.competencyId));
    if (input.ratings.some((rating) => !allowed.has(rating.competencyId))) throw new ApplicationInvariantError("VALIDATION_ERROR", "Scorecard contains a competency outside the active protocol.");
    const started = await startAction(tx, ctx, {
      actionType: "submit_scorecard",
      targetRefs: [`scorecard:${scorecard.id}`],
      parameters: { scorecardId: scorecard.id, protocolVersionId: input.protocolVersionId, ratings: input.ratings },
      rationale: input.amend ? "Amend a submitted scorecard with evidence." : "Submit a complete scorecard with evidence.",
      idempotencyKey: input.idempotencyKey,
      status: "EXECUTING",
    });
    if (started.replayed && started.action.status === "SUCCEEDED") {
      return { value: started.action.executionOutcome as ReadinessSnapshotResult & { scorecardId: string; status: string }, actionId: started.action.id, replayed: true };
    }
    if (input.amend) {
      await tx.delete(s.scorecardRatings).where(eq(s.scorecardRatings.scorecardId, scorecard.id));
    }
    await tx.insert(s.scorecardRatings).values(
      input.ratings.map((rating) => ({
        scorecardId: scorecard.id,
        competencyId: rating.competencyId,
        organizationId: ctx.tenant.organizationId,
        rating: rating.rating,
        evidenceNote: rating.evidenceNote,
        rubricAnchor: rating.rubricAnchor ?? null,
      })),
    );
    await tx.insert(s.evidenceObservations).values(
      input.ratings.map((rating) => ({
        organizationId: ctx.tenant.organizationId,
        applicationId: application.id,
        competencyId: rating.competencyId,
        protocolVersionId: protocol.id,
        sourceType: "INTERVIEW_SCORECARD",
        sourceObjectId: scorecard.id,
        observation: rating.evidenceNote,
        raterUserId: ctx.actor.userId,
        rating: rating.rating,
        artifactReference: `scorecard:${scorecard.id}`,
        provenance: "HUMAN_ENTERED",
      })),
    );
    const now = new Date();
    await tx.update(s.scorecards).set({ status: targetStatus, submittedAt: now, updatedAt: now }).where(eq(s.scorecards.id, scorecard.id));
    const readiness = await persistReadiness(tx, ctx, application, protocol);
    const value = { scorecardId: scorecard.id, status: targetStatus, ...readiness };
    await writeDomainEvent(tx, ctx.tenant, {
      eventType: "scorecard.submitted",
      aggregateType: "scorecard",
      aggregateId: scorecard.id,
      payload: { protocolVersionId: protocol.id, status: targetStatus, readiness: readiness.result.status },
      actorType: actorType(ctx.actor),
      actorId: ctx.actor.userId,
      correlationId: ctx.correlationId,
    });
    await writeAudit(tx, ctx.tenant, {
      actorType: actorType(ctx.actor),
      actorId: ctx.actor.userId,
      actionType: "submit_scorecard",
      targetType: "scorecard",
      targetId: scorecard.id,
      authorityClass: "A1",
      policyVersion: protocol.decisionReadinessRulesetVersion,
      evidenceRefs: input.ratings.map((rating) => `scorecard:${scorecard.id}:competency:${rating.competencyId}`),
      beforeState: { status: scorecard.status },
      afterState: { status: targetStatus, readiness: readiness.result.status },
      outcome: "SUCCEEDED",
      correlationId: ctx.correlationId,
    });
    await completeAction(tx, started.action.id, value);
    return { value, actionId: started.action.id, replayed: false };
  });
}

export async function recomputeDecisionReadiness(
  db: RecruiterPalDb,
  ctx: ApplicationContext,
  input: { applicationId: string; protocolVersionId: string },
): Promise<ReadinessSnapshotResult> {
  assertContext(ctx);
  const parsed = z.object({ applicationId: uuid, protocolVersionId: uuid }).parse(input);
  return withTenant(db, ctx.tenant, async (tx) => {
    const application = await getApplication(tx, ctx, parsed.applicationId);
    const protocol = await getProtocol(tx, ctx, application, parsed.protocolVersionId);
    return persistReadiness(tx, ctx, application, protocol);
  });
}

export async function createException(
  db: RecruiterPalDb,
  ctx: ApplicationContext,
  rawInput: CreateExceptionInput,
): Promise<MutationResult<ExceptionRow>> {
  assertContext(ctx);
  const input = createExceptionInputSchema.parse(rawInput);
  denyAgentMutation(ctx.actor, "Agents may report exceptions through bounded tools but may not mutate exception state directly.");
  return withTenant(db, ctx.tenant, async (tx) => {
    const deduplicationKey = buildExceptionKey({
      organizationId: ctx.tenant.organizationId,
      jobId: input.jobId,
      applicationId: input.applicationId,
      type: input.type,
      scopeKey: input.scopeKey,
    });
    const started = await startAction(tx, ctx, {
      actionType: "create_exception",
      targetRefs: [input.applicationId ? `application:${input.applicationId}` : `organization:${ctx.tenant.organizationId}`],
      parameters: { deduplicationKey, type: input.type },
      rationale: input.detail,
      idempotencyKey: input.idempotencyKey,
      status: "EXECUTING",
    });
    if (started.replayed && started.action.status === "SUCCEEDED") {
      return { value: started.action.executionOutcome as ExceptionRow, actionId: started.action.id, replayed: true };
    }
    const [inserted] = await tx
      .insert(s.exceptions)
      .values({
        organizationId: ctx.tenant.organizationId,
        deduplicationKey,
        type: input.type,
        severity: input.severity as ExceptionSeverity,
        jobId: input.jobId,
        applicationId: input.applicationId,
        interviewId: input.interviewId,
        title: input.title,
        detail: input.detail,
        deadlineAt: input.deadlineAt,
        status: "OPEN",
      })
      .onConflictDoNothing({ target: [s.exceptions.organizationId, s.exceptions.deduplicationKey] })
      .returning();
    let exception = inserted;
    if (!exception) {
      const [existing] = await tx
        .select()
        .from(s.exceptions)
        .where(and(eq(s.exceptions.organizationId, ctx.tenant.organizationId), eq(s.exceptions.deduplicationKey, deduplicationKey)))
        .limit(1);
      if (!existing) throw new ApplicationInvariantError("STALE_STATE", "Exception deduplication read failed.");
      const reopened = existing.status === "RESOLVED" || existing.status === "DISMISSED_WITH_REASON";
      if (reopened) {
        const [updated] = await tx
          .update(s.exceptions)
          .set({ status: "OPEN", title: input.title, detail: input.detail, deadlineAt: input.deadlineAt, resolvedAt: null, resolutionReason: null, lastRecomputedAt: new Date() })
          .where(eq(s.exceptions.id, existing.id))
          .returning();
        exception = updated;
      } else {
        const [updated] = await tx.update(s.exceptions).set({ title: input.title, detail: input.detail, deadlineAt: input.deadlineAt, lastRecomputedAt: new Date() }).where(eq(s.exceptions.id, existing.id)).returning();
        exception = updated;
      }
    }
    if (!exception) throw new ApplicationInvariantError("STALE_STATE", "Exception write failed.");
    await writeDomainEvent(tx, ctx.tenant, {
      eventType: "exception.recomputed",
      aggregateType: "exception",
      aggregateId: exception.id,
      payload: { type: exception.type, status: exception.status, deduplicationKey },
      actorType: actorType(ctx.actor),
      actorId: ctx.actor.userId,
      correlationId: ctx.correlationId,
    });
    await writeAudit(tx, ctx.tenant, {
      actorType: actorType(ctx.actor),
      actorId: ctx.actor.userId,
      actionType: "create_exception",
      targetType: "exception",
      targetId: exception.id,
      authorityClass: "A1",
      policyVersion: POLICY_VERSION,
      afterState: { status: exception.status, deduplicationKey },
      outcome: "SUCCEEDED",
      correlationId: ctx.correlationId,
    });
    await completeAction(tx, started.action.id, exception as unknown as Record<string, unknown>);
    return { value: exception, actionId: started.action.id, replayed: false };
  });
}

export async function resolveException(
  db: RecruiterPalDb,
  ctx: ApplicationContext,
  rawInput: ResolveExceptionInput,
): Promise<MutationResult<ExceptionRow>> {
  assertContext(ctx);
  const input = resolveExceptionInputSchema.parse(rawInput);
  assertPermission(ctx.actor, PERMISSIONS.EXCEPTION_RESOLVE);
  denyAgentMutation(ctx.actor, "Agents may recommend exception resolution but may not resolve exceptions directly.");
  return withTenant(db, ctx.tenant, async (tx) => {
    const [exception] = await tx.select().from(s.exceptions).where(and(eq(s.exceptions.id, input.exceptionId), eq(s.exceptions.organizationId, ctx.tenant.organizationId))).limit(1);
    if (!exception) throw new ApplicationInvariantError("NOT_FOUND", "Exception was not found in this organization.");
    const started = await startAction(tx, ctx, {
      actionType: "resolve_exception",
      targetRefs: [`exception:${exception.id}`],
      parameters: { exceptionId: exception.id, reason: input.reason },
      rationale: input.reason,
      idempotencyKey: input.idempotencyKey,
      status: "EXECUTING",
    });
    if (started.replayed && started.action.status === "SUCCEEDED") return { value: started.action.executionOutcome as ExceptionRow, actionId: started.action.id, replayed: true };
    const [updated] = await tx.update(s.exceptions).set({ status: "RESOLVED", resolvedAt: new Date(), resolutionReason: input.reason, lastRecomputedAt: new Date() }).where(eq(s.exceptions.id, exception.id)).returning();
    if (!updated) throw new ApplicationInvariantError("STALE_STATE", "Exception resolution failed.");
    await writeDomainEvent(tx, ctx.tenant, { eventType: "exception.resolved", aggregateType: "exception", aggregateId: exception.id, payload: { reason: input.reason }, actorType: actorType(ctx.actor), actorId: ctx.actor.userId, correlationId: ctx.correlationId });
    await writeAudit(tx, ctx.tenant, { actorType: actorType(ctx.actor), actorId: ctx.actor.userId, actionType: "resolve_exception", targetType: "exception", targetId: exception.id, authorityClass: "A2", policyVersion: POLICY_VERSION, beforeState: { status: exception.status }, afterState: { status: "RESOLVED", reason: input.reason }, outcome: "SUCCEEDED", correlationId: ctx.correlationId });
    await completeAction(tx, started.action.id, updated as unknown as Record<string, unknown>);
    return { value: updated, actionId: started.action.id, replayed: false };
  });
}

export async function createObligation(
  db: RecruiterPalDb,
  ctx: ApplicationContext,
  rawInput: CreateObligationInput,
): Promise<MutationResult<ObligationRow>> {
  assertContext(ctx);
  const input = createObligationInputSchema.parse(rawInput);
  denyAgentMutation(ctx.actor, "Agents may propose obligations but may not create durable obligations directly.");
  return withTenant(db, ctx.tenant, async (tx) => {
    const started = await startAction(tx, ctx, {
      actionType: "create_obligation",
      targetRefs: [input.applicationId ? `application:${input.applicationId}` : `organization:${ctx.tenant.organizationId}`],
      parameters: { applicationId: input.applicationId, interviewId: input.interviewId, obligationType: input.obligationType, workflowRef: input.workflowRef },
      rationale: `Create ${input.obligationType} obligation.`,
      idempotencyKey: input.idempotencyKey,
      status: "EXECUTING",
    });
    if (started.replayed && started.action.status === "SUCCEEDED") return { value: started.action.executionOutcome as ObligationRow, actionId: started.action.id, replayed: true };
    const where = [
      eq(s.applicationObligations.organizationId, ctx.tenant.organizationId),
      eq(s.applicationObligations.obligationType, input.obligationType),
      inArray(s.applicationObligations.state, ["PENDING", "ESCALATED"]),
    ];
    if (input.applicationId) where.push(eq(s.applicationObligations.applicationId, input.applicationId)); else where.push(isNull(s.applicationObligations.applicationId));
    if (input.interviewId) where.push(eq(s.applicationObligations.interviewId, input.interviewId)); else where.push(isNull(s.applicationObligations.interviewId));
    if (input.responsibleUserId) where.push(eq(s.applicationObligations.responsibleUserId, input.responsibleUserId)); else where.push(isNull(s.applicationObligations.responsibleUserId));
    const [existing] = await tx.select().from(s.applicationObligations).where(and(...where)).limit(1);
    const obligation = existing ?? (await tx.insert(s.applicationObligations).values({ organizationId: ctx.tenant.organizationId, applicationId: input.applicationId, interviewId: input.interviewId, obligationType: input.obligationType, responsibleUserId: input.responsibleUserId, dueAt: input.dueAt, state: "PENDING", workflowRef: input.workflowRef }).returning())[0];
    if (!obligation) throw new ApplicationInvariantError("STALE_STATE", "Obligation write failed.");
    await writeDomainEvent(tx, ctx.tenant, { eventType: "obligation.created", aggregateType: "obligation", aggregateId: obligation.id, payload: { obligationType: obligation.obligationType, state: obligation.state }, actorType: actorType(ctx.actor), actorId: ctx.actor.userId, correlationId: ctx.correlationId });
    await writeAudit(tx, ctx.tenant, { actorType: actorType(ctx.actor), actorId: ctx.actor.userId, actionType: "create_obligation", targetType: "obligation", targetId: obligation.id, authorityClass: "A1", policyVersion: POLICY_VERSION, afterState: { state: obligation.state, dueAt: obligation.dueAt.toISOString() }, outcome: "SUCCEEDED", correlationId: ctx.correlationId });
    await completeAction(tx, started.action.id, obligation as unknown as Record<string, unknown>);
    return { value: obligation, actionId: started.action.id, replayed: false };
  });
}

export async function resolveObligation(
  db: RecruiterPalDb,
  ctx: ApplicationContext,
  rawInput: ResolveObligationInput,
): Promise<MutationResult<ObligationRow>> {
  assertContext(ctx);
  const input = resolveObligationInputSchema.parse(rawInput);
  denyAgentMutation(ctx.actor, "Agents may recommend obligation resolution but may not resolve obligations directly.");
  return withTenant(db, ctx.tenant, async (tx) => {
    const [obligation] = await tx.select().from(s.applicationObligations).where(and(eq(s.applicationObligations.id, input.obligationId), eq(s.applicationObligations.organizationId, ctx.tenant.organizationId))).limit(1);
    if (!obligation) throw new ApplicationInvariantError("NOT_FOUND", "Obligation was not found in this organization.");
    const started = await startAction(tx, ctx, { actionType: "resolve_obligation", targetRefs: [`obligation:${obligation.id}`], parameters: { obligationId: obligation.id }, rationale: "Satisfy the explicit obligation.", idempotencyKey: input.idempotencyKey, status: "EXECUTING" });
    if (started.replayed && started.action.status === "SUCCEEDED") return { value: started.action.executionOutcome as ObligationRow, actionId: started.action.id, replayed: true };
    const [updated] = await tx.update(s.applicationObligations).set({ state: "SATISFIED", satisfiedAt: new Date(), updatedAt: new Date() }).where(eq(s.applicationObligations.id, obligation.id)).returning();
    if (!updated) throw new ApplicationInvariantError("STALE_STATE", "Obligation resolution failed.");
    await writeDomainEvent(tx, ctx.tenant, { eventType: "obligation.resolved", aggregateType: "obligation", aggregateId: obligation.id, payload: { state: "SATISFIED" }, actorType: actorType(ctx.actor), actorId: ctx.actor.userId, correlationId: ctx.correlationId });
    await writeAudit(tx, ctx.tenant, { actorType: actorType(ctx.actor), actorId: ctx.actor.userId, actionType: "resolve_obligation", targetType: "obligation", targetId: obligation.id, authorityClass: "A1", policyVersion: POLICY_VERSION, beforeState: { state: obligation.state }, afterState: { state: "SATISFIED" }, outcome: "SUCCEEDED", correlationId: ctx.correlationId });
    await completeAction(tx, started.action.id, updated as unknown as Record<string, unknown>);
    return { value: updated, actionId: started.action.id, replayed: false };
  });
}

export async function requestApproval(
  db: RecruiterPalDb,
  ctx: ApplicationContext,
  rawInput: RequestApprovalInput,
): Promise<MutationResult<{ action: ActionRow; approval: ApprovalRow }>> {
  assertContext(ctx);
  const input = requestApprovalInputSchema.parse(rawInput);
  assertPermission(ctx.actor, PERMISSIONS.APPROVAL_REQUEST);
  const authority = authorityFor(input.actionType);
  if (authority !== "A2") throw new ApplicationInvariantError("VALIDATION_ERROR", "Only A2 actions use the approval workflow.");
  return withTenant(db, ctx.tenant, async (tx) => {
    const started = await startAction(tx, ctx, { actionType: input.actionType, targetRefs: input.targetRefs, parameters: input.parameters, rationale: input.rationale, evidenceRefs: input.evidenceRefs, idempotencyKey: input.idempotencyKey, expiresAt: input.expiresAt, status: "AWAITING_APPROVAL" });
    const [existingApproval] = await tx.select().from(s.approvals).where(and(eq(s.approvals.actionId, started.action.id), eq(s.approvals.organizationId, ctx.tenant.organizationId))).limit(1);
    const approval = existingApproval ?? (await tx.insert(s.approvals).values({ organizationId: ctx.tenant.organizationId, actionId: started.action.id, requiredPermission: input.requiredPermission, requestedByUserId: ctx.actor.origin === "human" ? ctx.actor.userId : null, status: "PENDING", policyVersion: POLICY_VERSION, evidenceRefs: input.evidenceRefs, reason: input.rationale, expiresAt: input.expiresAt }).returning())[0];
    if (!approval) throw new ApplicationInvariantError("STALE_STATE", "Approval write failed.");
    if (started.replayed) return { value: { action: started.action, approval }, actionId: started.action.id, replayed: true };
    await writeDomainEvent(tx, ctx.tenant, { eventType: "approval.requested", aggregateType: "action", aggregateId: started.action.id, payload: { approvalId: approval.id, actionType: input.actionType }, actorType: actorType(ctx.actor), actorId: ctx.actor.userId, correlationId: ctx.correlationId });
    await writeAudit(tx, ctx.tenant, { actorType: actorType(ctx.actor), actorId: ctx.actor.userId, actionType: "approval_requested", targetType: "approval", targetId: approval.id, authorityClass: "A2", policyVersion: POLICY_VERSION, evidenceRefs: input.evidenceRefs, afterState: { status: "PENDING", actionId: started.action.id }, outcome: "SUCCEEDED", correlationId: ctx.correlationId });
    return { value: { action: started.action, approval }, actionId: started.action.id, replayed: false };
  });
}

export async function decideApproval(
  db: RecruiterPalDb,
  ctx: ApplicationContext,
  rawInput: DecideApprovalInput,
): Promise<MutationResult<{ approval: ApprovalRow; action: ActionRow }>> {
  assertContext(ctx);
  const input = decideApprovalInputSchema.parse(rawInput);
  assertHumanAuthority(ctx.actor, PERMISSIONS.APPROVAL_DECIDE);
  return withTenant(db, ctx.tenant, async (tx) => {
    const [approval] = await tx.select().from(s.approvals).where(and(eq(s.approvals.id, input.approvalId), eq(s.approvals.organizationId, ctx.tenant.organizationId))).limit(1);
    if (!approval) throw new ApplicationInvariantError("NOT_FOUND", "Approval was not found in this organization.");
    const [action] = approval.actionId ? await tx.select().from(s.actions).where(and(eq(s.actions.id, approval.actionId), eq(s.actions.organizationId, ctx.tenant.organizationId))).limit(1) : [];
    if (!action) throw new ApplicationInvariantError("NOT_FOUND", "Approval action was not found.");
    const started = await startAction(tx, ctx, { actionType: "request_approval", targetRefs: [`approval:${approval.id}`], parameters: { approvalId: approval.id, decision: input.decision }, rationale: input.reason, idempotencyKey: input.idempotencyKey, status: "EXECUTING" });
    if (started.replayed && started.action.status === "SUCCEEDED") return { value: started.action.executionOutcome as { approval: ApprovalRow; action: ActionRow }, actionId: started.action.id, replayed: true };
    const now = new Date();
    const [updatedApproval] = await tx.update(s.approvals).set({ status: input.decision, decidedByUserId: ctx.actor.userId, decidedAt: now, reason: input.reason }).where(and(eq(s.approvals.id, approval.id), eq(s.approvals.status, "PENDING"))).returning();
    if (!updatedApproval) throw new ApplicationInvariantError("STALE_STATE", "Approval was decided concurrently.");
    const [updatedAction] = await tx.update(s.actions).set({ status: input.decision === "APPROVED" ? "APPROVED" : "REJECTED", updatedAt: now }).where(eq(s.actions.id, action.id)).returning();
    if (!updatedAction) throw new ApplicationInvariantError("STALE_STATE", "Approval action update failed.");
    const value = { approval: updatedApproval, action: updatedAction };
    await writeDomainEvent(tx, ctx.tenant, { eventType: "approval.decided", aggregateType: "approval", aggregateId: approval.id, payload: { decision: input.decision, actionId: action.id }, actorType: "HUMAN", actorId: ctx.actor.userId, correlationId: ctx.correlationId });
    await writeAudit(tx, ctx.tenant, { actorType: "HUMAN", actorId: ctx.actor.userId, actionType: "approval_decided", targetType: "approval", targetId: approval.id, authorityClass: "A3", policyVersion: POLICY_VERSION, beforeState: { status: approval.status }, afterState: { status: input.decision }, outcome: "SUCCEEDED", correlationId: ctx.correlationId });
    await completeAction(tx, started.action.id, value as unknown as Record<string, unknown>);
    return { value, actionId: started.action.id, replayed: false };
  });
}

export async function proposeAction(
  db: RecruiterPalDb,
  ctx: ApplicationContext,
  rawInput: ProposeActionInput,
): Promise<MutationResult<ActionRow>> {
  assertContext(ctx);
  const input = proposeActionInputSchema.parse(rawInput);
  const authority = authorityFor(input.actionType);
  if (input.requestedAuthorityClass && input.requestedAuthorityClass !== authority) throw new ApplicationInvariantError("FORBIDDEN", "The requested authority class does not match deterministic policy.");
  return withTenant(db, ctx.tenant, async (tx) => {
    const started = await startAction(tx, ctx, { actionType: input.actionType, targetRefs: input.targetRefs, parameters: input.parameters, rationale: input.rationale, evidenceRefs: input.evidenceRefs, idempotencyKey: input.idempotencyKey, createdByAgentSessionId: input.createdByAgentSessionId, expiresAt: input.expiresAt, status: "PROPOSED" });
    if (started.replayed) return { value: started.action, actionId: started.action.id, replayed: true };
    if (authority === "A2") {
      await tx.insert(s.approvals).values({ organizationId: ctx.tenant.organizationId, actionId: started.action.id, requiredPermission: PERMISSIONS.APPLICATION_WRITE, requestedByUserId: ctx.actor.origin === "human" ? ctx.actor.userId : null, status: "PENDING", policyVersion: POLICY_VERSION, evidenceRefs: input.evidenceRefs, reason: input.rationale, expiresAt: input.expiresAt });
    }
    await writeDomainEvent(tx, ctx.tenant, { eventType: "action.proposed", aggregateType: "action", aggregateId: started.action.id, payload: { actionType: input.actionType, authorityClass: authority }, actorType: actorType(ctx.actor), actorId: ctx.actor.userId, correlationId: ctx.correlationId });
    await writeAudit(tx, ctx.tenant, { actorType: actorType(ctx.actor), actorId: ctx.actor.origin === "human" ? ctx.actor.userId : null, actionType: "action_proposed", targetType: "action", targetId: started.action.id, authorityClass: authority, policyVersion: POLICY_VERSION, evidenceRefs: input.evidenceRefs, afterState: { status: "PROPOSED" }, outcome: "SUCCEEDED", correlationId: ctx.correlationId });
    return { value: started.action, actionId: started.action.id, replayed: false };
  });
}

export async function recordDecision(
  db: RecruiterPalDb,
  ctx: ApplicationContext,
  rawInput: RecordDecisionInput,
): Promise<MutationResult<{ applicationId: string; decision: string; status: string; readiness: ReadinessSnapshotResult }>> {
  assertContext(ctx);
  const input = recordDecisionInputSchema.parse(rawInput);
  assertHumanAuthority(ctx.actor, PERMISSIONS.DECIDE_TERMINAL);
  return withTenant(db, ctx.tenant, async (tx) => {
    const application = await getApplication(tx, ctx, input.applicationId);
    const protocol = await getProtocol(tx, ctx, application, input.protocolVersionId);
    const readiness = await persistReadiness(tx, ctx, application, protocol);
    if ((input.decision === "HIRE" || input.decision === "REJECT") && readiness.result.status !== "READY") {
      throw new ApplicationInvariantError("READINESS_BLOCKED", `Human decision requires READY readiness; current status is ${readiness.result.status}.`);
    }
    const actionType: ActionType = input.decision === "HIRE" ? "hire_candidate" : input.decision === "REJECT" ? "reject_candidate" : "propose_stage_transition";
    const started = await startAction(tx, ctx, { actionType, targetRefs: [`application:${application.id}`], parameters: { decision: input.decision, protocolVersionId: input.protocolVersionId }, rationale: input.rationale, idempotencyKey: input.idempotencyKey, status: "EXECUTING" });
    if (started.replayed && started.action.status === "SUCCEEDED") return { value: started.action.executionOutcome as { applicationId: string; decision: string; status: string; readiness: ReadinessSnapshotResult }, actionId: started.action.id, replayed: true };
    const status = input.decision === "HIRE" ? "HIRED" : input.decision === "REJECT" ? "REJECTED" : application.status;
    const stage = input.decision === "HIRE" ? "HIRED" : input.decision === "REJECT" ? "REJECTED" : application.currentStage;
    const now = new Date();
    const [record] = await tx.insert(s.decisionRecords).values({ organizationId: ctx.tenant.organizationId, applicationId: application.id, decision: input.decision, decidedByUserId: ctx.actor.userId, readinessSnapshotId: readiness.snapshotId, rationale: input.rationale }).returning({ id: s.decisionRecords.id });
    if (!record) throw new ApplicationInvariantError("STALE_STATE", "Decision record write failed.");
    if (status !== application.status || stage !== application.currentStage) await tx.update(s.applications).set({ status, currentStage: stage, lastActivityAt: now, updatedAt: now }).where(eq(s.applications.id, application.id));
    if (status !== application.status || stage !== application.currentStage) await tx.insert(s.applicationStageEvents).values({ organizationId: ctx.tenant.organizationId, applicationId: application.id, fromStage: application.currentStage, toStage: stage, reason: input.rationale, actorType: "HUMAN", actorUserId: ctx.actor.userId, humanAuthorityRecordRef: record.id, protocolVersionId: protocol.id, occurredAt: now });
    const value = { applicationId: application.id, decision: input.decision, status, readiness };
    await writeDomainEvent(tx, ctx.tenant, { eventType: "application.decision_recorded", aggregateType: "application", aggregateId: application.id, payload: { decision: input.decision, readiness: readiness.result.status, decisionRecordId: record.id }, actorType: "HUMAN", actorId: ctx.actor.userId, correlationId: ctx.correlationId });
    await writeAudit(tx, ctx.tenant, { actorType: "HUMAN", actorId: ctx.actor.userId, actionType: actionType, targetType: "application", targetId: application.id, authorityClass: input.decision === "HIRE" || input.decision === "REJECT" ? "A3" : "A0", policyVersion: protocol.decisionReadinessRulesetVersion, beforeState: { status: application.status, currentStage: application.currentStage }, afterState: { status, currentStage: stage, decision: input.decision }, outcome: "SUCCEEDED", correlationId: ctx.correlationId });
    await completeAction(tx, started.action.id, value as unknown as Record<string, unknown>);
    return { value, actionId: started.action.id, replayed: false };
  });
}
