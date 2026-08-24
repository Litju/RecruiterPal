import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export interface DbConfig {
  connectionString: string;
  max?: number;
}

let cachedPool: Pool | null = null;

/** Application runtime connects as the restricted `rp_app` role when available. */
function resolveUser(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    return url.username || "postgres";
  } catch {
    return "postgres";
  }
}

export function createDb(config: DbConfig) {
  const pool = new Pool({
    connectionString: config.connectionString,
    max: config.max ?? 10,
    application_name: "recruiterpal",
  });
  const db = drizzle(pool, { schema });
  return { db, pool };
}

/**
 * Singleton-style accessor used by app code. In tests, construct explicit
 * instances instead.
 */
export function getDb(): ReturnType<typeof createDb>["db"] {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required. Copy .env.example to .env.local and configure a database.",
    );
  }
  if (!cachedPool) {
    const created = createDb({ connectionString });
    cachedPool = created.pool;
  }
  return drizzle(cachedPool, { schema });
}

export type RecruiterPalDb = ReturnType<typeof getDb>;
export { schema };
