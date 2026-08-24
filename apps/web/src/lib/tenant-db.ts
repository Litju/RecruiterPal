import { getDb, withTenant, type TenantTx } from "@recruiterpal/db";
import type { PalSession } from "./session";

export function tenantContext(session: Pick<PalSession, "organizationId" | "userId">) {
  return { organizationId: session.organizationId, userId: session.userId };
}

export function withSessionTenant<T>(
  session: Pick<PalSession, "organizationId" | "userId">,
  fn: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  return withTenant(getDb(), tenantContext(session), fn);
}
