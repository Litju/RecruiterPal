import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createDb, schema, seedDemoWorld, type DemoWorldIds } from "@recruiterpal/db";
import { executeWorkflow } from "../src/index";

const adminUrl = process.env.RP_TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? "postgresql://postgres:recruiterpal@localhost:5499/recruiterpal";
const appUrl = process.env.RP_APP_TEST_DATABASE_URL ?? process.env.RP_APP_DATABASE_URL ?? "postgresql://rp_app:recruiterpal@localhost:5499/recruiterpal";
let admin: ReturnType<typeof createDb>;
let app: ReturnType<typeof createDb>;
let world: DemoWorldIds;

beforeAll(async () => {
  admin = createDb({ connectionString: adminUrl, max: 4 });
  app = createDb({ connectionString: appUrl, max: 4 });
  world = await seedDemoWorld(admin.db, { seed: 424242 });
});

afterAll(async () => {
  await admin.pool.end();
  await app.pool.end();
});

describe("durable workflow execution", () => {
  it("records a scorecard reminder and escalation exactly once across retries", async () => {
    const [interview] = await admin.db.select().from(schema.interviews).where(and(eq(schema.interviews.organizationId, world.organizationId), eq(schema.interviews.status, "COMPLETED"))).limit(1);
    expect(interview).toBeDefined();
    const submitted = await admin.db.select({ id: schema.scorecards.id }).from(schema.scorecards).where(and(eq(schema.scorecards.organizationId, world.organizationId), eq(schema.scorecards.interviewId, interview!.id), eq(schema.scorecards.status, "SUBMITTED")));
    await admin.db.update(schema.interviews).set({ requiresScorecardsFrom: submitted.length + 1, completedAt: interview!.completedAt ?? new Date() }).where(eq(schema.interviews.id, interview!.id));
    const input = {
      workflowType: "scorecard_chase" as const,
      organizationId: world.organizationId,
      userId: world.recruiters[0]!.id,
      businessObjectId: interview!.id,
      interviewId: interview!.id,
      applicationId: interview!.applicationId,
      now: new Date((interview!.completedAt ?? new Date()).getTime() + 2),
      gracePeriodMs: 0,
      escalationPeriodMs: 86_400_000,
    };
    const first = await executeWorkflow(app.db, input);
    const second = await executeWorkflow(app.db, input);
    expect(first.status).toBe("WAITING");
    expect(second.status).toBe("BLOCKED");
    const actions = await admin.db.select().from(schema.actions).where(and(eq(schema.actions.organizationId, world.organizationId), eq(schema.actions.actionType, "send_scorecard_reminder")));
    const exceptions = await admin.db.select().from(schema.exceptions).where(and(eq(schema.exceptions.organizationId, world.organizationId), eq(schema.exceptions.type, "MISSING_SCORECARD")));
    const instances = await admin.db.select().from(schema.workflowInstances).where(and(eq(schema.workflowInstances.organizationId, world.organizationId), eq(schema.workflowInstances.workflowType, "scorecard_chase"), eq(schema.workflowInstances.businessObjectId, interview!.id)));
    expect(actions).toHaveLength(1);
    expect(exceptions).toHaveLength(1);
    expect(instances).toHaveLength(1);
  });
});
