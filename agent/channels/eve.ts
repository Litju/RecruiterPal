import { defaultEveAuth, eveChannel } from "eve/channels/eve";
import { localDev, placeholderAuth, type AuthFn } from "eve/channels/auth";
import type { SessionAuthContext } from "eve/context";

/**
 * Bridge Eve's channel auth to the Better Auth session owned by the web app.
 * Only non-secret identity and permission claims cross this boundary.
 */
const betterAuthSession: AuthFn<Request> = async (request): Promise<SessionAuthContext | null> => {
  const baseUrl = process.env.BETTER_AUTH_URL;
  const cookie = request.headers.get("cookie");
  if (!baseUrl || !cookie) return null;
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/u, "")}/api/agent/context`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const context = (await response.json()) as {
      userId?: string;
      organizationId?: string;
      role?: string;
      permissions?: string[];
    };
    if (!context.userId || !context.organizationId || !context.role || !context.permissions)
      return null;
    return {
      principalId: context.userId,
      principalType: "user",
      authenticator: "better-auth",
      attributes: {
        userId: context.userId,
        organizationId: context.organizationId,
        role: context.role,
        permissions: context.permissions,
      },
    };
  } catch {
    return null;
  }
};

export default eveChannel({
  auth: [betterAuthSession, localDev(), placeholderAuth()],
  onMessage(ctx, message) {
    const auth = defaultEveAuth(ctx);
    const caller = ctx.eve.caller;
    const organizationId = caller?.attributes.organizationId;
    const actorUserId = caller?.attributes.userId ?? caller?.principalId;
    const role = caller?.attributes.role;
    const context =
      organizationId && actorUserId && role
        ? [
            `RecruiterPal authenticated context: organizationId=${organizationId}; actorUserId=${actorUserId}; role=${role}. Use typed tools and preserve this context.`,
          ]
        : [];
    void message;
    return { auth, context };
  },
});
