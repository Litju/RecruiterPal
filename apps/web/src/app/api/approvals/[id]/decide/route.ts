import { NextResponse } from "next/server";
import { ApplicationInvariantError, decideApproval } from "@recruiterpal/application";
import { UnauthorizedError } from "@recruiterpal/domain";
import { getDb } from "../../../../../lib/db";
import { getAuth } from "../../../../../lib/auth";
import { getSession } from "../../../../../lib/session";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession(getAuth());
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const params = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const result = await decideApproval(
      getDb(),
      {
        tenant: { organizationId: session.organizationId, userId: session.userId },
        actor: session.actor,
      },
      {
        ...body,
        approvalId: params.id,
      } as never,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ApplicationInvariantError) {
      const status =
        error instanceof UnauthorizedError ? 403 : error.code === "NOT_FOUND" ? 404 : 409;
      return NextResponse.json(
        {
          error: error.message,
          code: error instanceof ApplicationInvariantError ? error.code : "FORBIDDEN",
        },
        { status },
      );
    }
    return NextResponse.json({ error: "Invalid approval request" }, { status: 400 });
  }
}
