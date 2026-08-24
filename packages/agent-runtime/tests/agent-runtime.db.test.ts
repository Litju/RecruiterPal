import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createDb, schema, seedDemoWorld, withTenant, type DemoWorldIds } from "@recruiterpal/db";
import { permissionsForRoles } from "@recruiterpal/domain";
import { createAgentSession, finishAgentSession, type AgentAccess } from "../src";

const adminUrl = process.env.RP_TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? "postgresql://postgres:recruiterpal@localhost:5499/recruiterpal";
const appUrl = process.env.RP_APP_TEST_DATABASE_URL ?? process.env.RP_APP_DATABASE_URL ?? "postgresql://rp_app:recruiterpal@localhost:5499/recruiterpal";
let admin: ReturnType<typeof createDb>;
let app: ReturnType<typeof createDb>;
let world: DemoWorldIds;

beforeAll(async () => {
  admin = createDb({ connectionString: adminUrl, max: 3 });
  app = createDb({ connectionString: appUrl, max: 3 });
  world = await seedDemoWorld(admin.db, { seed: 424242 });
});

afterAll(async () => {
  await admin.pool.end();
  await app.pool.end();
});

describe("Eve adapter persistence", () => {
  it("persists and closes a tenant-scoped agent session", async () => {
    const userId = world.recruiters[0]!.id;
    const access: AgentAccess = {
      tenant: { organizationId: world.organizationId, userId },
      actor: { userId, organizationId: world.organizationId, roles: ["recruiter"], permissions: permissionsForRoles(["recruiter"]), origin: "agent" },
      sessionId: "eve-session-db-test",
      context: {
        actorUserId: userId,
        organizationId: world.organizationId,
        permissions: [...permissionsForRoles(["recruiter"])],
        surface: "today",
        selectedEntityRefs: [],
        filters: {},
        timezone: "UTC",
        locale: "en-US",
        authorizationPolicyVersion: "ap-1.0.0",
      },
    };
    const id = await createAgentSession(app.db, access);
    const [created] = await withTenant(app.db, access.tenant, (tx) => tx.select({ id: schema.agentSessions.id, eveSessionRef: schema.agentSessions.eveSessionRef, organizationId: schema.agentSessions.organizationId }).from(schema.agentSessions).where(and(eq(schema.agentSessions.id, id), eq(schema.agentSessions.eveSessionRef, access.sessionId))));
    expect(created?.organizationId).toBe(world.organizationId);
    await finishAgentSession(app.db, access.tenant, access.sessionId);
    const [closed] = await withTenant(app.db, access.tenant, (tx) => tx.select({ endedAt: schema.agentSessions.endedAt }).from(schema.agentSessions).where(eq(schema.agentSessions.id, id)));
    expect(closed?.endedAt).toBeInstanceOf(Date);
  });
});
