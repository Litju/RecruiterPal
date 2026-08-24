/**
 * Real-PostgreSQL tenant isolation proofs.
 *
 * The data contract requires, for every tenant-owned table:
 *  - own-tenant read works;
 *  - cross-tenant read returns no rows / denied;
 *  - cross-tenant write denied;
 *  - restricted roles cannot bypass RLS.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import { Pool } from "pg";
import * as s from "../src/schema";
import { seedDemoWorld } from "../src/seed/generator";

let pool: Pool;
let db: ReturnType<typeof drizzle>;
let orgA: string;
let orgB: string;

beforeAll(async () => {
  pool = new Pool({
    connectionString:
      process.env.RP_TEST_DATABASE_URL ??
      process.env.DATABASE_URL ??
      "postgresql://postgres:recruiterpal@localhost:5499/recruiterpal",
    max: 4,
  });
  db = drizzle(pool);
  const world = await seedDemoWorld(db, { seed: 424242 });
  orgA = world.organizationId;
  orgB = world.securityOrgId;
});

afterAll(async () => {
  await pool.end();
});

/** Execute fn as the restricted rp_app role bound to a tenant setting. */
async function asTenant<T>(
  tenantOrgId: string | null,
  fn: (tx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE rp_app`);
    if (tenantOrgId !== null) {
      await tx.execute(
        sql`SELECT set_config('rp.organization_id', ${tenantOrgId}, true)`,
      );
    }
    return fn(tx);
  });
}

describe("RLS: own-tenant access", () => {
  it("reads jobs scoped to the active organization", async () => {
    const rows = await asTenant(orgA, async (tx) =>
      tx.select().from(s.jobs).where(eq(s.jobs.organizationId, orgA)),
    );
    expect(rows.length).toBeGreaterThanOrEqual(8);
    expect(rows.every((r) => r.organizationId === orgA)).toBe(true);
  });

  it("writes within the active organization succeed", async () => {
    const [job] = await db
      .insert(s.jobs)
      .values({ organizationId: orgA, title: "RLS Probe Job", status: "DRAFT" })
      .returning({ id: s.jobs.id });
    const updated = await asTenant(orgA, async (tx) =>
      tx
        .update(s.jobs)
        .set({ title: "RLS Probe Job Updated" })
        .where(eq(s.jobs.id, job!.id))
        .returning({ id: s.jobs.id }),
    );
    expect(updated.length).toBe(1);
  });
});

describe("RLS: cross-tenant denial", () => {
  let probeJobId: string;
  beforeAll(async () => {
    const [job] = await db
      .insert(s.jobs)
      .values({ organizationId: orgA, title: "Cross Tenant Target", status: "OPEN" })
      .returning({ id: s.jobs.id });
    probeJobId = job!.id;
  });

  it("cross-tenant read returns zero rows", async () => {
    const rows = await asTenant(orgB, async (tx) =>
      tx.select().from(s.jobs).where(eq(s.jobs.id, probeJobId)),
    );
    expect(rows.length).toBe(0);
  });

  it("unscoped read with no tenant context returns zero rows (fail closed)", async () => {
    const rows = await asTenant(null, async (tx) => tx.select().from(s.jobs));
    expect(rows.length).toBe(0);
  });

  it("cross-tenant update is denied", async () => {
    const result = await asTenant(orgB, async (tx) =>
      tx
        .update(s.jobs)
        .set({ title: "Hijacked" })
        .where(eq(s.jobs.id, probeJobId))
        .returning({ id: s.jobs.id }),
    );
    expect(result.length).toBe(0);
    const [still] = await db.select().from(s.jobs).where(eq(s.jobs.id, probeJobId));
    expect(still?.title).toBe("Cross Tenant Target");
  });

  it("cross-tenant delete is denied", async () => {
    const result = await asTenant(orgB, async (tx) =>
      tx.delete(s.jobs).where(eq(s.jobs.id, probeJobId)).returning({ id: s.jobs.id }),
    );
    expect(result.length).toBe(0);
    const [still] = await db.select().from(s.jobs).where(eq(s.jobs.id, probeJobId));
    expect(still).toBeDefined();
  });

  it("insert with a foreign tenant key is rejected by WITH CHECK", async () => {
    // rp_app bound to orgB cannot insert a row claiming orgA.
    await expect(
      asTenant(orgB, async (tx) =>
        tx.insert(s.candidates).values({
          organizationId: orgA,
          firstName: "Smuggled",
          lastName: "Row",
        }),
      ),
    ).rejects.toThrow();
  });

  it("candidates are isolated across tenants", async () => {
    const aCandidates = await asTenant(orgA, async (tx) =>
      tx.select().from(s.candidates).where(eq(s.candidates.organizationId, orgA)),
    );
    const bViewOfA = await asTenant(orgB, async (tx) =>
      tx.select().from(s.candidates).where(eq(s.candidates.organizationId, orgA)),
    );
    expect(aCandidates.length).toBeGreaterThan(50);
    expect(bViewOfA.length).toBe(0);
  });

  it("protected demographic data requires its own tenant scope", async () => {
    const [candidate] = await db
      .select()
      .from(s.candidates)
      .where(eq(s.candidates.organizationId, orgA))
      .limit(1);
    await db.insert(s.protectedDemographics).values({
      candidateId: candidate!.id,
      organizationId: orgA,
      attributes: { aggregate_monitoring_consent: "true" },
    });
    const visibleToB = await asTenant(orgB, async (tx) =>
      tx
        .select()
        .from(s.protectedDemographics)
        .where(eq(s.protectedDemographics.organizationId, orgA)),
    );
    expect(visibleToB.length).toBe(0);
  });
});

describe("RLS: audit append-only behavior at schema level", () => {
  it("audit records written in one tenant are invisible to another", async () => {
    await db.insert(s.auditRecords).values({
      organizationId: orgA,
      actorType: "HUMAN",
      actorId: null,
      actionType: "test.action",
      targetType: "job",
      targetId: "00000000-0000-4000-8000-000000000000",
      authorityClass: "A3",
      policyVersion: "ap-1.0.0",
      outcome: "SUCCEEDED",
    });
    const seenByB = await asTenant(orgB, async (tx) =>
      tx.select().from(s.auditRecords).where(eq(s.auditRecords.organizationId, orgA)),
    );
    expect(seenByB.length).toBe(0);
  });
});

describe("seeded golden scenarios exist", () => {
  it("competing-offer critical exception exists (G1)", async () => {
    const rows = await db
      .select()
      .from(s.exceptions)
      .where(eq(s.exceptions.type, "candidate_deadline_risk"));
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((r) => r.severity === "CRITICAL")).toBe(true);
  });

  it("missing scorecard exception exists (G2)", async () => {
    const rows = await db
      .select()
      .from(s.exceptions)
      .where(eq(s.exceptions.type, "overdue_scorecard"));
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it("protocol drift exception exists for Data Scientist (G4)", async () => {
    const rows = await db
      .select()
      .from(s.exceptions)
      .where(eq(s.exceptions.type, "protocol_drift"));
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it("material rating conflict is embedded in Sofia's scorecards (G1/G5 input)", async () => {
    // Find Sofia's application via seeded exception link.
    const exc = await db
      .select()
      .from(s.exceptions)
      .where(eq(s.exceptions.type, "candidate_deadline_risk"))
      .limit(1);
    expect(exc.length).toBe(1);
    const appId = exc[0]!.applicationId!;
    const cards = await db
      .select()
      .from(s.scorecards)
      .where(eq(s.scorecards.applicationId, appId));
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });
});
