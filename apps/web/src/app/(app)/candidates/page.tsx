import { desc, eq, sql } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { withSessionTenant } from "@/lib/tenant-db";
import { candidates } from "@recruiterpal/db";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { CandidateWorkspaceDrawer } from "@/components/CandidateWorkspaceDrawer";

export const metadata = { title: "Candidates" };

export default async function CandidatesPage() {
  const session = await getSession(getAuth());
  if (!session) return null;
  const rows = await withSessionTenant(session, (tx) => tx
    .select({
      id: candidates.id,
      name: sql<string>`${candidates.firstName} || ' ' || ${candidates.lastName}`,
      headline: candidates.headline,
      source: candidates.source,
      createdAt: candidates.createdAt,
    })
    .from(candidates)
    .where(eq(candidates.organizationId, session.organizationId))
    .orderBy(desc(candidates.createdAt))
    .limit(200));

  return (
    <div className="flex h-full flex-col">
      <WorkspaceHeader title="Candidates" subtitle={`${rows.length} people records`} />
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <CandidateWorkspaceDrawer rows={rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))} />
      </div>
    </div>
  );
}
