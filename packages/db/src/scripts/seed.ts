import { createDb } from "../client";
import { seedDemoWorld } from "../seed/generator";
import { requireEnv } from "./env";

const connectionString = requireEnv("DATABASE_URL");

const { db, pool } = createDb({ connectionString, max: 4 });

try {
  const world = await seedDemoWorld(db, { seed: 1337 });
  console.log("Seeded Northstar Labs demo world.");
  console.log(`  organization: ${world.organizationId}`);
  console.log(`  security tenant: ${world.securityOrgId}`);
  console.log(`  jobs: ${world.jobs.length}`);
} catch (err) {
  console.error("Seed failed:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
