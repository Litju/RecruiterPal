/**
 * RecruiterPal-owned typed contracts crossing every boundary (UI ↔ agent ↔
 * workflow ↔ integration). Mirrors docs/build-contract/contracts/*.json.
 * No unvalidated model blobs may enter mutations.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Authority classes
// ---------------------------------------------------------------------------

export const authorityClassSchema = z.enum(["A0", "A1", "A2", "A3"]);
export type AuthorityClass = z.infer<typeof authorityClassSchema>;

// ---------------------------------------------------------------------------
// InteractionContext — constructed by application code, never inferred by the
// model. The model never derives tenancy.
// ---------------------------------------------------------------------------

export const entityRefSchema = z.object({
  type: z.enum([
    "job",
    "application",
    "candidate",
    "interview",
    "exception",
    "scorecard",
    "thread",
  ]),
  id: z.string().uuid(),
});

export const interactionContextSchema = z.object({
  actorUserId: z.string().uuid(),
  organizationId: z.string().uuid(),
  permissions: z.array(z.string()),
  surface: z.string().min(1),
  selectedEntityRefs: z.array(entityRefSchema).default([]),
  filters: z.record(z.string(), z.unknown()).default({}),
  timezone: z.string().default("UTC"),
  locale: z.string().default("en-US"),
  authorizationPolicyVersion: z.string().min(1),
});
export type InteractionContext = z.infer<typeof interactionContextSchema>;

// ---------------------------------------------------------------------------
// UIIntent — finite enum plus typed target/payload; never arbitrary markup.
// ---------------------------------------------------------------------------

export const uiIntentTypeSchema = z.enum([
  "FOCUS_EXCEPTION",
  "OPEN_APPLICATION_PANEL",
  "OPEN_EVIDENCE_MATRIX",
  "OPEN_SCORECARD_COMPARE",
  "FILTER_PIPELINE",
  "OPEN_TIMELINE_RANGE",
  "OPEN_ACTION_PREVIEW",
  "OPEN_DECISION_BRIEF",
  "OPEN_SCHEDULING_RESOLUTION",
  "NAVIGATE_SURFACE",
]);

export const uiIntentSchema = z.object({
  type: uiIntentTypeSchema,
  targetId: z.string().nullable().default(null),
  payload: z.record(z.string(), z.unknown()).default({}),
});
export type UiIntent = z.infer<typeof uiIntentSchema>;
export type UiIntentType = z.infer<typeof uiIntentTypeSchema>;

// ---------------------------------------------------------------------------
// ActionProposal — created by proposal tools; domain code derives the final
// allowed authority class.
// ---------------------------------------------------------------------------

export const actionProposalSchema = z.object({
  id: z.string().uuid(),
  actionType: z.string().min(1),
  targetRefs: z.array(z.string()),
  parameters: z.record(z.string(), z.unknown()),
  rationale: z.string(),
  evidenceRefs: z.array(z.string()),
  requestedAuthorityClass: authorityClassSchema,
  createdByAgentSessionId: z.string(),
  expiresAt: z.string().datetime({ offset: true }).nullable().default(null),
});
export type ActionProposal = z.infer<typeof actionProposalSchema>;

// ---------------------------------------------------------------------------
// PalResponse
// ---------------------------------------------------------------------------

export const runtimeStatusSchema = z.enum([
  "ACCEPTED",
  "RETRIEVING",
  "EXECUTING",
  "WAITING",
  "APPROVAL_REQUIRED",
  "COMPLETED",
  "FAILED",
]);
export type RuntimeStatus = z.infer<typeof runtimeStatusSchema>;

export const palResponseSchema = z.object({
  summary: z.string(),
  evidenceRefs: z.array(z.string()).default([]),
  uiIntents: z.array(uiIntentSchema).default([]),
  actionProposals: z.array(actionProposalSchema).default([]),
  uncertaintyFlags: z.array(z.string()).default([]),
  requiresHumanReview: z.boolean(),
  runtimeStatus: runtimeStatusSchema,
});
export type PalResponse = z.infer<typeof palResponseSchema>;

// ---------------------------------------------------------------------------
// Tool error contract — structured errors, never stack traces or secrets.
// ---------------------------------------------------------------------------

export const toolErrorCodeSchema = z.enum([
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "STALE_STATE",
  "APPROVAL_REQUIRED",
  "POLICY_BLOCKED",
  "VALIDATION_ERROR",
  "INTEGRATION_UNAVAILABLE",
  "RATE_LIMITED",
  "PROVIDER_UNAVAILABLE",
]);
export type ToolErrorCode = z.infer<typeof toolErrorCodeSchema>;

export class ToolError extends Error {
  constructor(
    public readonly code: ToolErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ToolError";
  }
}

// ---------------------------------------------------------------------------
// Agent runtime event stream — stable RecruiterPal-owned event model mapped
// from Eve events. High-level process status only; no private chain-of-thought.
// ---------------------------------------------------------------------------

export const agentEventNameSchema = z.enum([
  "AGENT_ACCEPTED",
  "AGENT_RETRIEVING",
  "TOOL_STARTED",
  "TOOL_COMPLETED",
  "SUBAGENT_STARTED",
  "SUBAGENT_COMPLETED",
  "APPROVAL_REQUIRED",
  "AGENT_WAITING",
  "AGENT_COMPLETED",
  "AGENT_FAILED",
]);
export type AgentEventName = z.infer<typeof agentEventNameSchema>;

export const agentEventSchema = z.object({
  sessionId: z.string(),
  seq: z.number().int().nonnegative(),
  name: agentEventNameSchema,
  label: z.string().optional(),
  detail: z.string().optional(),
  toolName: z.string().optional(),
  occurredAt: z.string().datetime({ offset: true }),
});
export type AgentEvent = z.infer<typeof agentEventSchema>;

// ---------------------------------------------------------------------------
// Audit record (application-level append-only ledger)
// ---------------------------------------------------------------------------

export const auditRecordSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  actorType: z.enum(["HUMAN", "AGENT", "WORKFLOW", "INTEGRATION"]),
  actorId: z.string().nullable().default(null),
  actionType: z.string().min(1),
  targetType: z.string().min(1),
  targetId: z.string().min(1),
  authorityClass: authorityClassSchema,
  policyVersion: z.string().min(1),
  evidenceRefs: z.array(z.string()).default([]),
  approvalRef: z.string().nullable().default(null),
  workflowRef: z.string().nullable().default(null),
  beforeState: z.record(z.string(), z.unknown()).nullable().default(null),
  afterState: z.record(z.string(), z.unknown()).nullable().default(null),
  outcome: z.string().min(1),
  errorCode: toolErrorCodeSchema.nullable().default(null),
  occurredAt: z.string().datetime({ offset: true }),
});
export type AuditRecord = z.infer<typeof auditRecordSchema>;
