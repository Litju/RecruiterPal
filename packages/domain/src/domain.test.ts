import { describe, expect, it } from "vitest";
import {
  assertHumanAuthority,
  assertJobTransition,
  assertPermission,
  authorityFor,
  buildIdempotencyKey,
  computeDecisionReadiness,
  computeFeasibleSlots,
  computeSlaState,
  detectMaterialConflicts,
  IllegalTransitionError,
  isHumanOnly,
  PERMISSIONS,
  permissionsForRoles,
  UnauthorizedError,
  buildExceptionKey,
} from "./index";

const HOUR = 3_600_000;

describe("state machines", () => {
  it("allows DRAFT -> PENDING_APPROVAL -> OPEN", () => {
    expect(() => assertJobTransition("DRAFT", "PENDING_APPROVAL")).not.toThrow();
    expect(() => assertJobTransition("PENDING_APPROVAL", "OPEN")).not.toThrow();
  });

  it("rejects terminal resurrection", () => {
    expect(() => assertJobTransition("CLOSED_FILLED", "OPEN")).toThrow(IllegalTransitionError);
    expect(() => assertJobTransition("CLOSED_CANCELLED", "DRAFT")).toThrow();
  });
});

describe("authority", () => {
  const human = (perms: string[]) => ({
    userId: "u1",
    organizationId: "org1",
    roles: ["recruiter"],
    permissions: new Set(perms),
    origin: "human" as const,
  });

  it("grants recruiters DECIDE_TERMINAL but denies agents", () => {
    const actor = human([PERMISSIONS.DECIDE_TERMINAL]);
    expect(() => assertHumanAuthority(actor, PERMISSIONS.DECIDE_TERMINAL)).not.toThrow();

    const agent = { ...actor, origin: "agent" as const };
    expect(() => assertHumanAuthority(agent, PERMISSIONS.DECIDE_TERMINAL)).toThrow(
      /requires an authorized human/,
    );
    expect(isHumanOnly("reject_candidate")).toBe(true);
    expect(authorityFor("hire_candidate")).toBe("A3");
  });

  it("assertPermission fails closed on unknown permission", () => {
    expect(() => assertPermission(human([]), PERMISSIONS.JOB_WRITE)).toThrow(UnauthorizedError);
  });

  it("role expansion maps interviewer to scorecard-only surface", () => {
    const perms = permissionsForRoles(["interviewer"]);
    expect(perms.has(PERMISSIONS.SCORECARD_SUBMIT)).toBe(true);
    expect(perms.has(PERMISSIONS.JOB_OPEN)).toBe(false);
    expect(perms.has(PERMISSIONS.RESTRICTED_DEMOGRAPHICS_READ)).toBe(false);
  });
});

describe("SLA math", () => {
  it("classifies scorecard SLA states deterministically", () => {
    const created = new Date(0);
    expect(computeSlaState(created, new Date(1 * HOUR))).toBe("ON_TIME");
    expect(computeSlaState(created, new Date(30 * HOUR))).toBe("DUE_SOON");
    expect(computeSlaState(created, new Date(60 * HOUR))).toBe("OVERDUE");
    expect(computeSlaState(created, new Date(120 * HOUR))).toBe("ESCALATED");
  });

  it("builds stable idempotency keys", () => {
    const key = buildIdempotencyKey({
      organizationId: "o",
      workflowType: "wf01",
      businessObjectId: "i1",
      actionType: "send_scorecard_reminder",
      policyVersion: "ap-1.0.0",
      logicalAttempt: 1,
    });
    expect(key).toBe("o:wf01:i1:send_scorecard_reminder:ap-1.0.0:1");
  });
});

describe("decision readiness", () => {
  const base = {
    applicationStatus: "ACTIVE" as const,
    requiredStagesComplete: true,
    incompleteStageNames: [],
    missingScorecardCount: 0,
    competenciesMissingEvidence: [],
    staleProtocolEvidenceCount: 0,
    materialConflicts: [],
    missingApprovals: [],
  };

  it("returns READY when all checks pass", () => {
    expect(computeDecisionReadiness(base).status).toBe("READY");
  });

  it("returns INCOMPLETE when a required competency lacks evidence (G5)", () => {
    const result = computeDecisionReadiness({
      ...base,
      competenciesMissingEvidence: ["Technical Leadership"],
    });
    expect(result.status).toBe("INCOMPLETE");
    expect(result.missingEvidence).toContain("competency:Technical Leadership:evidence");
  });

  it("prioritizes INCOMPLETE over conflicts over approvals", () => {
    const result = computeDecisionReadiness({
      ...base,
      competenciesMissingEvidence: ["X"],
      materialConflicts: [{ competencyName: "Y", description: "5 vs 2" }],
      missingApprovals: ["offer_approval"],
    });
    expect(result.status).toBe("INCOMPLETE");
    expect(
      computeDecisionReadiness({
        ...base,
        materialConflicts: [{ competencyName: "Y", description: "5 vs 2" }],
        missingApprovals: ["offer_approval"],
      }).status,
    ).toBe("CONFLICT_REVIEW_REQUIRED");
  });

  it("is NOT_APPLICABLE for terminal applications", () => {
    expect(computeDecisionReadiness({ ...base, applicationStatus: "REJECTED" }).status).toBe(
      "NOT_APPLICABLE",
    );
  });
});

describe("rating conflicts", () => {
  it("flags only requirement-straddling spreads as material", () => {
    const ratings = [
      { scorecardId: "s1", raterId: "r1", competencyName: "Leadership", rating: 5 },
      { scorecardId: "s2", raterId: "r2", competencyName: "Leadership", rating: 3 },
      { scorecardId: "s3", raterId: "r1", competencyName: "Craft", rating: 4 },
      { scorecardId: "s4", raterId: "r2", competencyName: "Craft", rating: 4 },
    ];
    const conflicts = detectMaterialConflicts({ ratings, requiredLevel: 4 });
    expect(conflicts.length).toBe(1);
    expect(conflicts[0]!.competencyName).toBe("Leadership");
  });

  it("does not flag same-side disagreement", () => {
    const conflicts = detectMaterialConflicts({
      ratings: [
        { scorecardId: "s1", raterId: "r1", competencyName: "A", rating: 4 },
        { scorecardId: "s2", raterId: "r2", competencyName: "A", rating: 2 },
      ],
      conflictSpread: 2,
      requiredLevel: 2,
    });
    // Both ratings are >= requiredLevel 2; nobody falls below the boundary.
    expect(conflicts.length).toBe(0);
  });
});

describe("exception dedup keys", () => {
  it("are stable per scope", () => {
    const params = {
      organizationId: "o",
      jobId: null,
      applicationId: "app",
      type: "overdue_scorecard",
      scopeKey: "user-9",
    };
    expect(buildExceptionKey(params)).toBe(buildExceptionKey(params));
    expect(buildExceptionKey(params)).not.toBe(buildExceptionKey({ ...params, scopeKey: "x" }));
  });
});

describe("scheduling feasibility", () => {
  it("finds slots where all participants are free within working hours", () => {
    const searchFrom = new Date("2026-09-07T00:00:00Z"); // Monday
    const searchUntil = new Date(searchFrom.getTime() + 5 * 24 * HOUR);
    const avail = {
      p1: [{ personId: "p1", startUtc: searchFrom, endUtc: searchUntil }],
      p2: [{ personId: "p2", startUtc: searchFrom, endUtc: searchUntil }],
    };
    const busy = {
      p1: [
        {
          personId: "p1",
          startUtc: new Date("2026-09-07T14:00:00Z"),
          endUtc: new Date("2026-09-07T15:00:00Z"),
        },
      ],
      p2: [],
    };
    const slots = computeFeasibleSlots({
      participantIds: ["p1", "p2"],
      busyWindows: busy,
      availability: avail,
      searchFrom,
      searchUntil,
      constraints: {
        durationMinutes: 60,
        minLeadTimeMinutes: 0,
        bufferMinutes: 0,
        workingHoursUtc: { startHour: 12, endHour: 22 },
        workingDaysUtc: [1, 2, 3, 4, 5],
      },
      stepMinutes: 30,
    });
    expect(slots.length).toBeGreaterThan(0);
    // The overlapping 14:00–15:00 slot must never appear.
    const bad = slots.some((s) => s.startUtc.getUTCHours() === 14);
    expect(bad).toBe(false);
  });
});
