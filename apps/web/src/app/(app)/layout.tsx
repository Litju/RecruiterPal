import { redirect } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { getDb, exceptions, approvals } from "@recruiterpal/db";
import { PrimaryNav } from "@/components/PrimaryNav";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const auth = getAuth();
  const session = await getSession(auth);
  if (!session) redirect("/login");

  const db = getDb();
  const orgId = session.organizationId;

  const [criticalRows, approvalRows] = await Promise.all([
    db
      .select({ n: count() })
      .from(exceptions)
      .where(and(eq(exceptions.organizationId, orgId), eq(exceptions.severity, "CRITICAL"), eq(exceptions.status, "OPEN"))),
    db
      .select({ n: count() })
      .from(approvals)
      .where(and(eq(approvals.organizationId, orgId), eq(approvals.status, "PENDING"))),
  ]);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-56 shrink-0 border-r border-border-subtle bg-surface-1 md:block">
        <PrimaryNav
          organizationName={"Organization"}
          counts={{
            critical: criticalRows[0]?.n ?? 0,
            pendingApprovals: approvalRows[0]?.n ?? 0,
          }}
        />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
