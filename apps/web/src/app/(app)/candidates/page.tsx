import { desc, eq, sql } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { withSessionTenant } from "@/lib/tenant-db";
import { candidates } from "@recruiterpal/db";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";

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
        <ul role="list" className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <li
              key={c.id}
              data-candidate-id={c.id}
              className="rounded-card border border-border-subtle bg-surface-1 px-4 py-3"
            >
              <p className="truncate text-[14px] font-semibold">{c.name}</p>
              <p className="truncate text-[12px] text-text-secondary">{c.headline ?? ""}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-text-tertiary">
                source: {(c.source ?? "unknown").toLowerCase().replace(/_/g, " ")}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
