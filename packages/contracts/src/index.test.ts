import { describe, expect, it } from "vitest";
import {
  actionProposalSchema,
  auditRecordSchema,
  interactionContextSchema,
  palResponseSchema,
  ToolError,
  uiIntentSchema,
} from "./index";

const uuid = () => "11111111-1111-4111-8111-111111111111";

describe("uiIntentSchema", () => {
  it("accepts a finite intent and rejects arbitrary markup", () => {
    const ok = uiIntentSchema.parse({
      type: "OPEN_EVIDENCE_MATRIX",
      targetId: uuid(),
      payload: {},
    });
    expect(ok.type).toBe("OPEN_EVIDENCE_MATRIX");
    expect(uiIntentSchema.safeParse({ type: "RENDER_HTML", html: "<b/>" }).success).toBe(false);
  });
});

describe("palResponseSchema", () => {
  it("requires runtimeStatus and review flag", () => {
    const res = palResponseSchema.parse({
      summary: "Checked panel availability.",
      requiresHumanReview: false,
      runtimeStatus: "COMPLETED",
      uiIntents: [{ type: "FOCUS_EXCEPTION", targetId: null, payload: {} }],
    });
    expect(res.evidenceRefs).toEqual([]);
    expect(palResponseSchema.safeParse({ summary: "x" }).success).toBe(false);
  });

  it("rejects unknown runtime status values", () => {
    expect(
      palResponseSchema.safeParse({
        summary: "s",
        requiresHumanReview: false,
        runtimeStatus: "THINKING_OUT_LOUD",
      }).success,
    ).toBe(false);
  });
});

describe("interactionContextSchema", () => {
  it("validates tenancy fields", () => {
    const ctx = interactionContextSchema.parse({
      actorUserId: uuid(),
      organizationId: uuid(),
      permissions: ["application:read"],
      surface: "pipeline",
      selectedEntityRefs: [],
      authorizationPolicyVersion: "ap-1.0.0",
    });
    expect(ctx.timezone).toBe("UTC");
  });
});

describe("actionProposalSchema", () => {
  it("enforces authority class enum", () => {
    expect(
      actionProposalSchema.safeParse({
        id: uuid(),
        actionType: "send_scorecard_reminder",
        targetRefs: [],
        parameters: {},
        rationale: "SLA breached",
        evidenceRefs: [],
        requestedAuthorityClass: "A5",
        createdByAgentSessionId: "sess-1",
      }).success,
    ).toBe(false);
  });
});

describe("auditRecordSchema", () => {
  it("records actor type and authority", () => {
    const rec = auditRecordSchema.parse({
      id: uuid(),
      organizationId: uuid(),
      actorType: "WORKFLOW",
      actorId: "wf-123",
      actionType: "send_scorecard_reminder",
      targetType: "scorecard",
      targetId: uuid(),
      authorityClass: "A1",
      policyVersion: "ap-1.0.0",
      outcome: "SUCCEEDED",
      occurredAt: new Date().toISOString(),
    });
    expect(rec.actorType).toBe("WORKFLOW");
  });
});

describe("ToolError", () => {
  it("carries structured codes only", () => {
    const err = new ToolError("APPROVAL_REQUIRED", "needs human approval");
    expect(err.code).toBe("APPROVAL_REQUIRED");
  });
});
