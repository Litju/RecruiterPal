import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createDb, schema, seedDemoWorld, withTenant, type DemoWorldIds } from "@recruiterpal/db";
import { permissionsForRoles, type ActorContext } from "@recruiterpal/domain";
import {
  decideApproval,
  proposeAction,
  recomputeDecisionReadiness,
  requestApproval,
  submitScorecard,
  transitionApplication,
} from "../src/index";

const adminUrl = process.env.RP_TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? "postgresql://postgres:recruiterpal@localhost:5499/recruiterpal";
const appUrl = process.env.RP_APP_TEST_DATABASE_URL ?? process.env.RP_APP_DATABASE_URL ?? "postgresql://rp_app:recruiterpal@localhost:5499/recruiterpal";
let admin: ReturnType<typeof createDb>;
let app: ReturnType<typeof createDb>;
let world: DemoWorldIds;
let applicationId: string;
let protocolVersionId: string;

function actor(userId: string, role: string, origin: ActorContext["origin"] = "human"): ActorContext {
  return { userId, organizationId: world.organizationId, roles: [role], permissions: permissionsForRoles([role]), origin };
}

function context(userId: string, role: string, origin: ActorContext["origin"] = "human") {
  const currentActor = actor(userId, role, origin);
  return { tenant: { organizationId: world.organizationId, userId }, actor: currentActor };
}

beforeAll(async () => {
  admin = createDb({ connectionString: adminUrl, max: 4 });
  app = createDb({ connectionString: appUrl, max: 4 });
  world = await seedDemoWorld(admin.db, { seed: 424242 });
  const [appRow] = await admin.db.select({ id: schema.applications.id, protocolVersionId: schema.applications.protocolVersionId }).from(schema.applications).where(eq(schema.applications.id, world.sofiaApplicationId!));
  applicationId = appRow!.id;
  protocolVersionId = appRow!.protocolVersionId;
});

afterAll(async () => {
  await admin.pool.end();
  await app.pool.end();
});

describe("deterministic application boundary", () => {
  it("rejects stale protocol and invalid stage transitions", async () => {
    await expect(transitionApplication(app.db, context(world.recruiters[0]!.id, "recruiter"), {
      applicationId,
      protocolVersionId: "00000000-0000-4000-8000-000000000000",
      toStage: "DECISION",
      idempotencyKey: "stale-protocol",
    })).rejects.toMatchObject({ code: "STALE_PROTOCOL" });
    await expect(transitionApplication(app.db, context(world.recruiters[0]!.id, "recruiter"), {
      applicationId,
      protocolVersionId,
      toStage: "OFFER",
      expectedFromStage: "APPLIED",
      idempotencyKey: "wrong-from",
    })).rejects.toMatchObject({ code: "STALE_STATE" });
  });

  it("cannot execute a consequential decision from an agent origin", async () => {
    await expect(transitionApplication(app.db, context(world.recruiters[0]!.id, "recruiter", "agent"), {
      applicationId,
      protocolVersionId,
      toStage: "REJECTED",
      idempotencyKey: "agent-reject",
    })).rejects.toMatchObject({ name: "UnauthorizedError" });
  });

  it("requires and honors a human approval for an operational transition", async () => {
    const target = await admin.db.select({ currentStage: schema.applications.currentStage }).from(schema.applications).where(eq(schema.applications.id, applicationId));
    const fromStage = target[0]!.currentStage;
    const request = await requestApproval(app.db, context(world.recruiters[0]!.id, "recruiter"), {
      actionType: "execute_stage_transition",
      targetRefs: [`application:${applicationId}`],
      parameters: { toStage: "OFFER", protocolVersionId },
      rationale: "Human reviewer approved the next operational step.",
      evidenceRefs: [],
      requiredPermission: "application:write",
      expiresAt: null,
      idempotencyKey: "approval-transition",
    });
    await expect(transitionApplication(app.db, context(world.recruiters[0]!.id, "recruiter"), {
      applicationId,
      protocolVersionId,
      toStage: "OFFER",
      expectedFromStage: fromStage,
      idempotencyKey: "transition-without-approval",
    })).rejects.toMatchObject({ code: "APPROVAL_REQUIRED" });
    const decided = await decideApproval(app.db, context(world.recruiterLeadId, "admin"), {
      approvalId: request.value.approval.id,
      decision: "APPROVED",
      reason: "Approved by the recruiting lead.",
      idempotencyKey: "approve-transition",
    });
    const applied = await transitionApplication(app.db, context(world.recruiters[0]!.id, "recruiter"), {
      applicationId,
      protocolVersionId,
      toStage: "OFFER",
      expectedFromStage: fromStage,
      approvalId: decided.value.approval.id,
      idempotencyKey: "transition-approved",
    });
    expect(applied.value.currentStage).toBe("OFFER");
    const replay = await transitionApplication(app.db, context(world.recruiters[0]!.id, "recruiter"), {
      applicationId,
      protocolVersionId,
      toStage: "OFFER",
      expectedFromStage: fromStage,
      approvalId: decided.value.approval.id,
      idempotencyKey: "transition-approved",
    });
    expect(replay.replayed).toBe(true);
  });

  it("isolates assigned scorecard submission and persists evidence", async () => {
    const [scorecard] = await admin.db.select().from(schema.scorecards).where(eq(schema.scorecards.status, "OPEN")).limit(1);
    expect(scorecard).toBeDefined();
    const [protocolComp] = await admin.db.select({ protocolVersionId: schema.protocolCompetencies.protocolVersionId }).from(schema.protocolCompetencies).where(eq(schema.protocolCompetencies.protocolVersionId, scorecard!.protocolVersionId)).limit(1);
    const [candidate] = await admin.db.select({ id: schema.applications.id, protocolVersionId: schema.applications.protocolVersionId }).from(schema.applications).where(eq(schema.applications.id, scorecard!.applicationId));
    const comps = await admin.db.select({ competencyId: schema.protocolCompetencies.competencyId }).from(schema.protocolCompetencies).where(and(eq(schema.protocolCompetencies.protocolVersionId, protocolComp!.protocolVersionId), eq(schema.protocolCompetencies.isRequired, true)));
    const ratings = comps.map((item) => ({ competencyId: item.competencyId, rating: 4, evidenceNote: "Observed a concrete, rubric-anchored example." }));
    const submitted = await submitScorecard(app.db, context(scorecard!.raterUserId, "interviewer"), { scorecardId: scorecard!.id, protocolVersionId: candidate!.protocolVersionId, ratings, amend: false, idempotencyKey: "submit-open-card" });
    expect(submitted.value.status).toBe("SUBMITTED");
    const evidence = await withTenant(app.db, { organizationId: world.organizationId, userId: scorecard!.raterUserId }, (tx) => tx.select().from(schema.evidenceObservations).where(eq(schema.evidenceObservations.sourceObjectId, scorecard!.id)));
    expect(evidence.length).toBe(comps.length);
    await expect(submitScorecard(app.db, context(world.recruiters[0]!.id, "recruiter"), { scorecardId: scorecard!.id, protocolVersionId: candidate!.protocolVersionId, ratings, amend: false, idempotencyKey: "wrong-rater" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("persists readiness, action proposals, and idempotent action records", async () => {
    const readiness = await recomputeDecisionReadiness(app.db, context(world.recruiters[0]!.id, "recruiter"), { applicationId, protocolVersionId });
    expect(["INCOMPLETE", "CONFLICT_REVIEW_REQUIRED", "READY"]).toContain(readiness.result.status);
    const proposed = await proposeAction(app.db, { ...context(world.recruiters[0]!.id, "recruiter", "agent"), actor: actor(world.recruiters[0]!.id, "recruiter", "agent") }, {
      actionType: "reject_candidate",
      targetRefs: [`application:${applicationId}`],
      rationale: "Prepare a human-review proposal only.",
      parameters: { applicationId },
      evidenceRefs: [],
      requestedAuthorityClass: "A3",
      createdByAgentSessionId: "agent-session-test",
      expiresAt: null,
      idempotencyKey: "proposal-only",
    });
    expect(proposed.value.status).toBe("PROPOSED");
    const replay = await proposeAction(app.db, { ...context(world.recruiters[0]!.id, "recruiter", "agent"), actor: actor(world.recruiters[0]!.id, "recruiter", "agent") }, {
      actionType: "reject_candidate",
      targetRefs: [`application:${applicationId}`],
      rationale: "Prepare a human-review proposal only.",
      parameters: { applicationId },
      evidenceRefs: [],
      requestedAuthorityClass: "A3",
      createdByAgentSessionId: "agent-session-test",
      expiresAt: null,
      idempotencyKey: "proposal-only",
    });
    expect(replay.replayed).toBe(true);
    const appRows = await withTenant(app.db, { organizationId: world.organizationId, userId: world.recruiters[0]!.id }, (tx) => tx.select().from(schema.applications).where(eq(schema.applications.id, applicationId)));
    expect(appRows[0]!.status).toBe("ACTIVE");
  });
});
