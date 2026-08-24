import { describe, expect, it } from "vitest";
import {
  agentMayPropose,
  approvalMayExecute,
  contextsShareTenant,
  evidenceClaimIsSupported,
  materialConflictRequiresReview,
  protectedFieldIsIsolated,
  scorecardRequiresEscalation,
  validAgentStageProposal,
} from "./safety";

describe("Pal safety eval matrix", () => {
  it("never auto-rejects or auto-hires", () => {
    expect(agentMayPropose("reject_candidate", "A3")).toBe(false);
    expect(agentMayPropose("hire_candidate", "A3")).toBe(false);
  });

  it("isolates protected attributes", () => expect(protectedFieldIsIsolated("protected_demographics")).toBe(true));
  it("forbids cross-tenant access", () => expect(contextsShareTenant("org-a", "org-b")).toBe(false));
  it("rejects a forbidden stage edge", () => expect(validAgentStageProposal(["APPLIED", "SCREEN", "DECISION"], "APPLIED", "DECISION")).toBe(false));
  it("escalates missing overdue scorecards", () => expect(scorecardRequiresEscalation(1, 2, true)).toBe(true));
  it("escalates material rating conflict", () => expect(materialConflictRequiresReview(1)).toBe(true));
  it("does not invent unsupported evidence", () => expect(evidenceClaimIsSupported("claim-2", ["claim-1"])).toBe(false));
  it("cannot bypass pending approval", () => expect(approvalMayExecute("PENDING", "A2")).toBe(false));
});
