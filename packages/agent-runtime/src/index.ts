/**
 * RecruiterPal's Eve adapter boundary.
 *
 * Eve may schedule and interpret work, but this package owns the stable
 * contracts used by tools and the application layer. Provider credentials,
 * tenant context, and proposal writes never cross into browser code.
 */
import { createOpenAI } from "@ai-sdk/openai";
import { proposeAction, type ApplicationContext } from "@recruiterpal/application";
import { permissionsForRoles, type ActorContext, type Permission } from "@recruiterpal/domain";
import { getDb, withTenant, type RecruiterPalDb, type TenantContext } from "@recruiterpal/db";
import * as s from "@recruiterpal/db/schema";
import {
  actionProposalSchema,
  agentEventSchema,
  interactionContextSchema,
  palResponseSchema,
  type ActionProposal,
  type AgentEvent,
  type InteractionContext,
  type PalResponse,
  type UiIntent,
} from "@recruiterpal/contracts";
import type { ToolContext } from "eve/tools";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const AGENT_RUNTIME_VERSION = "0.2.0";
export const OPENCODE_GO_ENDPOINT =
  process.env.OPENCODE_GO_BASE_URL ?? "https://opencode.ai/zen/go/v1";
export const OPENCODE_GO_PROTOCOL = "responses" as const;
export const OPENCODE_GO_MODEL = "gpt-5.6-luna" as const;
export const AGENT_PROMPT_VERSION = "pal-1.0.0";

export interface ProviderQualificationState {
  configured: boolean;
  endpoint: string;
  protocol: typeof OPENCODE_GO_PROTOCOL;
  model: typeof OPENCODE_GO_MODEL;
}

/** Does not disclose the secret; used by release qualification and health UI. */
export function providerQualificationState(): ProviderQualificationState {
  return {
    configured: Boolean(process.env.OPENCODE_GO_API_KEY),
    endpoint: OPENCODE_GO_ENDPOINT,
    protocol: OPENCODE_GO_PROTOCOL,
    model: OPENCODE_GO_MODEL,
  };
}

/** Direct OpenCode Go Responses-compatible model. The key is server-only. */
export function createOpenCodeGoModel() {
  const provider = createOpenAI({
    apiKey: process.env.OPENCODE_GO_API_KEY,
    baseURL: OPENCODE_GO_ENDPOINT,
    name: "opencode-go",
  });
  return provider.responses(OPENCODE_GO_MODEL);
}

export const agentContextInputSchema = interactionContextSchema.extend({
  role: z.string().trim().min(1),
  authorityClass: z.enum(["A0", "A1", "A2", "A3"]),
  resourceRef: z.string().trim().min(1).optional(),
});

export type AgentContextInput = z.infer<typeof agentContextInputSchema>;

export interface AgentAccess {
  readonly tenant: TenantContext;
  readonly actor: ActorContext;
  readonly sessionId: string;
  readonly context: InteractionContext;
}

function attributeList(value: string | readonly string[] | undefined): string[] {
  return value === undefined ? [] : typeof value === "string" ? [value] : [...value];
}

function authAttributes(ctx: ToolContext): Readonly<Record<string, string | readonly string[]>> {
  const auth = ctx.session.auth.current;
  if (!auth) throw new Error("AGENT_CONTEXT_REQUIRED");
  return auth.attributes;
}

/**
 * Reconstructs an application ActorContext from Eve's authenticated session.
 * The model supplies resource intent only; organization, actor, role, and
 * permissions are taken from the authenticated session and checked here.
 */
export function assertAgentAccess(
  ctx: ToolContext,
  rawInput: AgentContextInput,
  required: Permission,
): AgentAccess {
  const input = agentContextInputSchema.parse(rawInput);
  const auth = ctx.session.auth.current;
  if (!auth) throw new Error("AGENT_CONTEXT_REQUIRED");
  const attrs = authAttributes(ctx);
  const organizationId = attributeList(attrs.organizationId ?? attrs.tenantId)[0];
  const actorUserId = attributeList(attrs.userId)[0] ?? auth.principalId;
  const roles = attributeList(attrs.roles ?? attrs.role);
  const claimedPermissions = attributeList(attrs.permissions);
  if (
    !organizationId ||
    organizationId !== input.organizationId ||
    actorUserId !== input.actorUserId
  ) {
    throw new Error("AGENT_CONTEXT_MISMATCH");
  }
  if (!roles.includes(input.role)) throw new Error("AGENT_ROLE_REQUIRED");
  const permissions = permissionsForRoles(roles);
  for (const permission of claimedPermissions) permissions.add(permission as Permission);
  if (!permissions.has(required)) throw new Error(`AGENT_PERMISSION_REQUIRED:${required}`);
  if (input.authorityClass === "A3") throw new Error("AGENT_A3_FORBIDDEN");
  return {
    tenant: { organizationId: input.organizationId, userId: input.actorUserId },
    actor: {
      userId: input.actorUserId,
      organizationId: input.organizationId,
      roles,
      permissions,
      sessionId: ctx.session.id,
      origin: "agent",
    },
    sessionId: ctx.session.id,
    context: input,
  };
}

export function buildApplicationContext(
  access: AgentAccess,
  correlationId?: string,
): ApplicationContext {
  return { tenant: access.tenant, actor: access.actor, correlationId };
}

export function requireCurrentAgentSession(ctx: ToolContext): string {
  if (!ctx.session.auth.current) throw new Error("AGENT_CONTEXT_REQUIRED");
  return ctx.session.id;
}

export async function createAgentSession(
  db: RecruiterPalDb,
  access: Pick<AgentAccess, "tenant" | "sessionId" | "context">,
): Promise<string> {
  return withTenant(db, access.tenant, async (tx) => {
    const [row] = await tx
      .insert(s.agentSessions)
      .values({
        organizationId: access.tenant.organizationId,
        userId: access.tenant.userId,
        eveSessionRef: access.sessionId,
        surface: access.context.surface,
        contextSnapshot: access.context,
        providerName: "opencode-go",
        modelName: OPENCODE_GO_MODEL,
        promptVersion: AGENT_PROMPT_VERSION,
      })
      .returning({ id: s.agentSessions.id });
    if (!row) throw new Error("AGENT_SESSION_PERSIST_FAILED");
    return row.id;
  });
}

export async function finishAgentSession(
  db: RecruiterPalDb,
  tenant: TenantContext,
  sessionId: string,
): Promise<void> {
  await withTenant(db, tenant, async (tx) => {
    await tx
      .update(s.agentSessions)
      .set({ endedAt: new Date() })
      .where(eq(s.agentSessions.eveSessionRef, sessionId));
  });
}

/** Persist a proposal through deterministic application code; never mutate canonical state here. */
export async function proposeAgentAction(
  db: RecruiterPalDb,
  access: AgentAccess,
  input: {
    actionType: ActionProposal["actionType"];
    targetRefs: string[];
    parameters: Record<string, unknown>;
    rationale: string;
    evidenceRefs: string[];
    idempotencyKey: string;
    expiresAt?: Date | null;
  },
): Promise<ActionProposal> {
  const result = await proposeAction(db, buildApplicationContext(access), {
    actionType: input.actionType as never,
    targetRefs: input.targetRefs,
    parameters: input.parameters,
    rationale: input.rationale,
    evidenceRefs: input.evidenceRefs,
    createdByAgentSessionId: access.sessionId,
    expiresAt: input.expiresAt ?? null,
    idempotencyKey: input.idempotencyKey,
  });
  return actionProposalSchema.parse({
    id: result.value.id,
    actionType: result.value.actionType,
    targetRefs: result.value.targetRefs,
    parameters: result.value.parameters,
    rationale: result.value.rationale,
    evidenceRefs: result.value.evidenceRefs,
    requestedAuthorityClass: result.value.requestedAuthorityClass,
    createdByAgentSessionId: access.sessionId,
    expiresAt: result.value.expiresAt?.toISOString() ?? null,
  });
}

export function completedPalResponse(input: {
  summary: string;
  evidenceRefs?: string[];
  uiIntents?: UiIntent[];
  actionProposals?: ActionProposal[];
  uncertaintyFlags?: string[];
  requiresHumanReview?: boolean;
}): PalResponse {
  return palResponseSchema.parse({
    summary: input.summary,
    evidenceRefs: input.evidenceRefs ?? [],
    uiIntents: input.uiIntents ?? [],
    actionProposals: input.actionProposals ?? [],
    uncertaintyFlags: input.uncertaintyFlags ?? [],
    requiresHumanReview: input.requiresHumanReview ?? (input.actionProposals?.length ?? 0) > 0,
    runtimeStatus: "COMPLETED",
  });
}

const hiddenReasoningNames = new Set([
  "reasoning.started",
  "reasoning.delta",
  "reasoning.completed",
]);

/** Map Eve lifecycle events to the public, non-chain-of-thought stream. */
export function mapEveEvent(
  event: { type?: string; name?: string; toolName?: string; detail?: string },
  sessionId: string,
  seq: number,
): AgentEvent | null {
  const name = event.type ?? event.name ?? "";
  if (hiddenReasoningNames.has(name)) return null;
  const mapped = name.includes("approval")
    ? "APPROVAL_REQUIRED"
    : name.includes("tool")
      ? name.includes("started")
        ? "TOOL_STARTED"
        : "TOOL_COMPLETED"
      : name.includes("waiting")
        ? "AGENT_WAITING"
        : name.includes("failed")
          ? "AGENT_FAILED"
          : name.includes("complete")
            ? "AGENT_COMPLETED"
            : name.includes("start")
              ? "AGENT_ACCEPTED"
              : "AGENT_RETRIEVING";
  return agentEventSchema.parse({
    sessionId,
    seq,
    name: mapped,
    label: name,
    detail: event.detail,
    toolName: event.toolName,
    occurredAt: new Date().toISOString(),
  });
}

/** The restricted app DB accessor is the only DB handle tools should use. */
export function restrictedAgentDb(): RecruiterPalDb {
  return getDb();
}

export * from "./safety";
