import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { requireEnv } from "./env";

const connectionString = requireEnv("DATABASE_URL");

const pool = new Pool({ connectionString, max: 2 });
const db = drizzle(pool);

try {
  await migrate(db, {
    migrationsFolder: new URL("../../drizzle", import.meta.url).pathname.replace(
      /^\/([A-Za-z]:)/,
      "$1",
    ),
  });
  console.log("Migrations applied.");
} catch (err) {
  console.error("Migration failed:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
