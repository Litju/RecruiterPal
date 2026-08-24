import { createRecruiterPalAuth } from "@recruiterpal/auth";
import { Pool } from "pg";

let cached: ReturnType<typeof createRecruiterPalAuth> | null = null;

/** Singleton Better Auth instance bound to the app database pool. */
export function getAuth() {
  if (!cached) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required");
    const pool = new Pool({ connectionString, max: 5 });
    cached = createRecruiterPalAuth({ pool });
  }
  return cached;
}

export type Auth = ReturnType<typeof getAuth>;
