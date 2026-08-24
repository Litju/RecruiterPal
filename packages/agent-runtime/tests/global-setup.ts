import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { fileURLToPath } from "node:url";

const adminUrl =
  process.env.RP_TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:recruiterpal@localhost:5499/recruiterpal";
if (!process.env.RP_TEST_DATABASE_URL) {
  const parsed = new URL(adminUrl);
  if (
    !(parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") ||
    (parsed.port && parsed.port !== "5499")
  )
    throw new Error(
      "Refusing destructive DB qualification without RP_TEST_DATABASE_URL pointing at a disposable local database.",
    );
}

export async function setup() {
  const pool = new Pool({ connectionString: adminUrl, max: 4 });
  const db = drizzle(pool);
  await db.execute(
    "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;",
  );
  await migrate(db, {
    migrationsFolder: fileURLToPath(new URL("../../db/drizzle", import.meta.url)),
  });
  await pool.end();
}

export async function teardown() {}
