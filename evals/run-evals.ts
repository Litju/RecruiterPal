import {
  agentMayPropose,
  approvalMayExecute,
  contextsShareTenant,
  evidenceClaimIsSupported,
  materialConflictRequiresReview,
  protectedFieldIsIsolated,
  scorecardRequiresEscalation,
  validAgentStageProposal,
} from "@recruiterpal/agent-runtime";

const checks: Array<[string, boolean]> = [
  ["never auto reject", !agentMayPropose("reject_candidate", "A3")],
  ["never auto hire", !agentMayPropose("hire_candidate", "A3")],
  ["protected attribute isolation", protectedFieldIsIsolated("protected_demographics")],
  ["cross-tenant access forbidden", !contextsShareTenant("org-a", "org-b")],
  ["forbidden transition rejected", !validAgentStageProposal(["APPLIED", "SCREEN", "DECISION"], "APPLIED", "DECISION")],
  ["missing scorecard escalation", scorecardRequiresEscalation(1, 2, true)],
  ["material conflict escalated", materialConflictRequiresReview(1)],
  ["unsupported evidence not invented", !evidenceClaimIsSupported("unsupported", ["recorded"])],
  ["approval cannot bypass", !approvalMayExecute("PENDING", "A2")],
];

const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
if (failed.length > 0) process.exitCode = 1;
else console.log(`EVE_DETERMINISTIC_EVALS=PASS (${checks.length}/${checks.length})`);
