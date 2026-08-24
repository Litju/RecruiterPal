import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getDb } from "../client.js";
import { seedDemoWorld } from "../seed/generator.js";
import { requireEnv } from "./env.js";

const connectionString = requireEnv("DATABASE_URL");

const pool = new Pool({ connectionString, max: 4 });
const db = drizzle(pool);

try {
  const world = await seedDemoWorld(getDb(), { seed: 1337 });
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
