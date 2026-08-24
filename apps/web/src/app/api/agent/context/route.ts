import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { getSession } from "@/lib/session";

/** Eve auth bridge: identity and permissions only, never provider credentials. */
export async function GET() {
  const session = await getSession(getAuth());
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(
    {
      userId: session.userId,
      organizationId: session.organizationId,
      role: session.role,
      permissions: [...session.actor.permissions],
    },
    { headers: { "cache-control": "no-store" } },
  );
}
