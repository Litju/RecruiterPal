import type { ToolContext } from "eve/tools";
import { PERMISSIONS, type Permission } from "@recruiterpal/domain";
import {
  assertAgentAccess,
  restrictedAgentDb,
  type AgentAccess,
  type AgentContextInput,
} from "@recruiterpal/agent-runtime";
import { withTenant, type TenantTx } from "@recruiterpal/db";

export function authorizeTool(
  ctx: ToolContext,
  input: AgentContextInput,
  permission: Permission,
  authorityClass: AgentContextInput["authorityClass"],
): AgentAccess {
  if (input.authorityClass !== authorityClass) throw new Error("AGENT_AUTHORITY_CONTEXT_MISMATCH");
  return assertAgentAccess(ctx, input, permission);
}

export function readWithTenant<T>(
  access: AgentAccess,
  fn: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  return withTenant(restrictedAgentDb(), access.tenant, fn);
}

export const readPermissions = {
  application: PERMISSIONS.APPLICATION_READ,
  candidate: PERMISSIONS.APPLICATION_READ,
  evidence: PERMISSIONS.EVIDENCE_READ,
  exception: PERMISSIONS.EXCEPTION_READ,
  interview: PERMISSIONS.INTERVIEW_READ,
  job: PERMISSIONS.JOB_READ,
  scorecard: PERMISSIONS.SCORECARD_READ,
} as const;

export function actionIdempotency(toolName: string, sessionId: string, key: string): string {
  return `agent:${sessionId}:${toolName}:${key}`;
}
