import { and, eq, sql } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { withSessionTenant } from "@/lib/tenant-db";
import { applications, candidates, jobs } from "@recruiterpal/db";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";

export const metadata = { title: "Pipeline" };

const STAGE_ORDER = [
  "APPLIED",
  "RECRUITER_REVIEW",
  "RECRUITER_SCREEN",
  "HM_REVIEW",
  "TECHNICAL_ASSESSMENT",
  "INTERVIEW_LOOP",
  "DECISION",
  "OFFER",
];

export default async function PipelinePage() {
  const session = await getSession(getAuth());
  if (!session) return null;
  const rows = await withSessionTenant(session, (tx) =>
    tx
      .select({
        id: applications.id,
        stage: applications.currentStage,
        candidateName: sql<string>`${candidates.firstName} || ' ' || ${candidates.lastName}`,
        headline: candidates.headline,
        jobTitle: jobs.title,
        lastActivity: applications.lastActivityAt,
      })
      .from(applications)
      .innerJoin(candidates, eq(candidates.id, applications.candidateId))
      .innerJoin(jobs, eq(jobs.id, applications.jobId))
      .where(
        and(
          eq(applications.organizationId, session.organizationId),
          eq(applications.status, "ACTIVE"),
        ),
      )
      .orderBy(applications.lastActivityAt)
      .limit(500),
  );

  const byStage = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byStage.get(r.stage) ?? [];
    list.push(r);
    byStage.set(r.stage, list);
  }

  return (
    <div className="flex h-full flex-col">
      <WorkspaceHeader
        title="Pipeline"
        subtitle={`${rows.length} active applications across ${byStage.size} stages`}
      />
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto px-6 py-5">
        <div className="flex min-w-max gap-4">
          {STAGE_ORDER.map((stage) => {
            const items = byStage.get(stage) ?? [];
            return (
              <section
                key={stage}
                aria-label={stage}
                className="w-64 shrink-0 rounded-card border border-border-subtle bg-surface-2 p-2"
              >
                <h2 className="mb-2 flex items-center justify-between px-2 text-[12px] font-semibold uppercase tracking-wide text-text-secondary">
                  {stage.replace(/_/g, " ")}
                  <span className="tabular text-text-tertiary">{items.length}</span>
                </h2>
                <ul className="space-y-1.5" role="list">
                  {items.map((a) => (
                    <li
                      key={a.id}
                      data-application-id={a.id}
                      className="rounded-control border border-border-subtle bg-surface-1 px-3 py-2 transition-shadow duration-150 hover:shadow-popover"
                    >
                      <p className="truncate text-[13px] font-medium">{a.candidateName}</p>
                      <p className="truncate text-[11px] text-text-tertiary">
                        {a.jobTitle}
                        {a.headline ? ` · ${a.headline}` : ""}
                      </p>
                    </li>
                  ))}
                  {items.length === 0 ? (
                    <li className="px-3 py-2 text-[12px] text-text-tertiary">Empty</li>
                  ) : null}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
