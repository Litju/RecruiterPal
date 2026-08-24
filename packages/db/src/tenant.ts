/**
 * Tenant scoping. Every request-scoped transaction sets
 * `rp.organization_id` so PostgreSQL RLS policies enforce isolation even if
 * application code has a bug. Fail closed: unset setting => no rows.
 */
import { sql } from "drizzle-orm";
import type { RecruiterPalDb } from "./client.js";

export const TENANT_SETTING = "rp.organization_id";

export interface TenantContext {
  organizationId: string;
  userId: string;
}

export type TenantTx = Parameters<Parameters<RecruiterPalDb["transaction"]>[0]>[0];

/**
 * Run `fn` inside a transaction whose RLS tenant setting is bound to the
 * given organization. set_config with is_local=true resets automatically at
 * transaction end.
 */
export async function withTenant<T>(
  db: RecruiterPalDb,
  ctx: TenantContext,
  fn: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('rp.organization_id', ${ctx.organizationId}, true), set_config('rp.user_id', ${ctx.userId}, true)`,
    );
    return fn(tx);
  });
}

/** Service-role path for explicit backend jobs only (migrations/seeds/reconciliation). */
export async function withServiceRole<T>(
  db: RecruiterPalDb,
  fn: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  return db.transaction(fn);
}
