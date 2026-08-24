/**
 * Server-side session resolution for server components / route handlers.
 * Fails closed: no valid session with an active organization => null.
 */
import { headers } from "next/headers";
import { permissionsForRoles, type ActorContext } from "@recruiterpal/domain";
import type { Auth } from "./auth";

export interface PalSession {
  userId: string;
  name: string;
  email: string;
  organizationId: string;
  role: string;
  actor: ActorContext;
}

export async function getSession(auth: Auth): Promise<PalSession | null> {
  const headerList = await headers();
  const result = await auth.api.getSession({ headers: headerList });
  if (!result?.user) return null;

  let activeOrganizationId = (
    result.session as unknown as { activeOrganizationId?: string | null }
  ).activeOrganizationId;

  const adapter = (await auth.$context).adapter;
  const membershipWhere = [{ field: "userId", value: result.user.id }];
  if (activeOrganizationId) {
    membershipWhere.push({ field: "organizationId", value: activeOrganizationId });
  }
  const memberships = (await adapter.findMany({
    model: "member",
    where: membershipWhere,
    limit: activeOrganizationId ? 1 : 2,
  })) as unknown as { organizationId?: string; role?: string }[];
  if (!activeOrganizationId) {
    if (memberships.length !== 1 || !memberships[0]?.organizationId) return null;
    activeOrganizationId = memberships[0].organizationId;
  }
  if (!memberships[0]?.organizationId || !memberships[0]?.role) return null;
  const role = memberships[0].role.toLowerCase();

  const actor: ActorContext = {
    userId: result.user.id,
    organizationId: activeOrganizationId,
    roles: [role],
    permissions: permissionsForRoles([role]),
    sessionId: result.session.id,
    origin: "human",
  };

  return {
    userId: result.user.id,
    name: result.user.name,
    email: result.user.email,
    organizationId: activeOrganizationId,
    role,
    actor,
  };
}
