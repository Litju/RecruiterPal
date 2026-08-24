/**
 * Better Auth configuration — organization-aware RBAC.
 * Tables are RecruiterPal-owned (see packages/db/src/schema.ts) and mapped
 * through the Drizzle adapter.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import * as schema from "@recruiterpal/db/schema";

export interface AuthConfig {
  pool: Pool;
  baseURL?: string;
  secret?: string;
}

export function createRecruiterPalAuth(config: AuthConfig) {
  const db: NodePgDatabase<typeof schema> = drizzle(config.pool, { schema });

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
        organization: schema.organizations,
        member: schema.memberships,
      },
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60,
      },
    },
    plugins: [
      organization({
        // Granular permission mapping lives in @recruiterpal/domain
        // ROLE_PERMISSIONS; Better Auth stores the role string on membership.
      }),
    ],
    advanced: {
      database: {
        generateId: false,
      },
    },
  });
}

export type RecruiterPalAuth = ReturnType<typeof createRecruiterPalAuth>;
