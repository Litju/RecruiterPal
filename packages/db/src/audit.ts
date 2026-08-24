/**
 * Append-only audit + domain event writers. Every material side effect must
 * call these; tests assert their presence.
 */
import { auditRecordSchema, type AuditRecord } from "@recruiterpal/contracts";
import * as s from "./schema";
import type { TenantContext, TenantTx } from "./tenant";

export interface AuditInput {
  actorType: "HUMAN" | "AGENT" | "WORKFLOW" | "INTEGRATION";
  actorId: string | null;
  actionType: string;
  targetType: string;
  targetId: string;
  authorityClass: "A0" | "A1" | "A2" | "A3";
  policyVersion: string;
  evidenceRefs?: string[];
  approvalRef?: string | null;
  workflowRef?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  outcome: string;
  errorCode?: string | null;
  correlationId?: string | null;
}

/** Write an audit record inside the current tenant-scoped transaction. */
export async function writeAudit(
  tx: TenantTx,
  ctx: TenantContext,
  input: AuditInput,
): Promise<AuditRecord> {
  const occurredAt = new Date();
  const row = {
    organizationId: ctx.organizationId,
    actorType: input.actorType,
    actorId: input.actorId,
    actionType: input.actionType,
    targetType: input.targetType,
    targetId: input.targetId,
    authorityClass: input.authorityClass,
    policyVersion: input.policyVersion,
    evidenceRefs: input.evidenceRefs ?? [],
    approvalRef: input.approvalRef ?? null,
    workflowRef: input.workflowRef ?? null,
    beforeState: input.beforeState ?? null,
    afterState: input.afterState ?? null,
    outcome: input.outcome,
    errorCode: input.errorCode ?? null,
    correlationId: input.correlationId ?? null,
    occurredAt,
  };
  const [inserted] = await tx
    .insert(s.auditRecords)
    .values(row)
    .returning({ id: s.auditRecords.id });

  const record = auditRecordSchema.parse({
    ...row,
    id: inserted?.id,
    occurredAt: occurredAt.toISOString(),
  });
  return record;
}

export interface DomainEventInput {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload?: Record<string, unknown>;
  actorType: "HUMAN" | "AGENT" | "WORKFLOW" | "INTEGRATION";
  actorId?: string | null;
  correlationId?: string | null;
}

export async function writeDomainEvent(
  tx: TenantTx,
  ctx: TenantContext,
  input: DomainEventInput,
): Promise<string> {
  const [inserted] = await tx
    .insert(s.domainEvents)
    .values({
      organizationId: ctx.organizationId,
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload ?? {},
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      correlationId: input.correlationId ?? null,
    })
    .returning({ id: s.domainEvents.id });
  return inserted!.id;
}
