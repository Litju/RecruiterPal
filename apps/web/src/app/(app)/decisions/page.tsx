import { and, desc, eq, sql } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { withSessionTenant } from "@/lib/tenant-db";
import { applications, candidates, decisionReadinessSnapshots, jobs } from "@recruiterpal/db";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";

export const metadata = { title: "Decisions" };

export default async function DecisionsPage() {
  const session = await getSession(getAuth());
  if (!session) return null;
  // Latest readiness snapshot per active application (deterministic states).
  const rows = await withSessionTenant(session, (tx) => tx
    .select({
      applicationId: applications.id,
      candidateName: sql<string>`${candidates.firstName} || ' ' || ${candidates.lastName}`,
      jobTitle: jobs.title,
      stage: applications.currentStage,
    })
    .from(applications)
    .innerJoin(candidates, eq(candidates.id, applications.candidateId))
    .innerJoin(jobs, eq(jobs.id, applications.jobId))
    .where(
      and(
        eq(applications.organizationId, session.organizationId),
        eq(applications.status, "ACTIVE"),
        eq(applications.currentStage, "DECISION"),
      ),
    )
    .orderBy(desc(applications.lastActivityAt))
    .limit(100));

  const snapshots = await withSessionTenant(session, (tx) => tx
    .select()
    .from(decisionReadinessSnapshots)
    .where(eq(decisionReadinessSnapshots.organizationId, session.organizationId))
    .orderBy(desc(decisionReadinessSnapshots.computedAt))
    .limit(300));
  const latestByApp = new Map<string, typeof snapshots[number]>();
  for (const s of snapshots) {
    if (!latestByApp.has(s.applicationId)) latestByApp.set(s.applicationId, s);
  }

  const STATUS_STYLE: Record<string, string> = {
    READY: "bg-success-subtle text-success",
    INCOMPLETE: "bg-warning-subtle text-warning",
    CONFLICT_REVIEW_REQUIRED: "bg-danger-subtle text-danger",
    APPROVAL_REQUIRED: "bg-info-subtle text-info",
    STALE: "bg-surface-3 text-text-secondary",
  };

  return (
    <div className="flex h-full flex-col">
      <WorkspaceHeader
        title="Decisions"
        subtitle="Decision-readiness is a process state — never a candidate score"
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {rows.length === 0 ? (
          <p className="rounded-card border border-dashed border-border-subtle bg-surface-1 px-4 py-6 text-[13px] text-text-tertiary">
            No candidates are at the decision stage yet.
          </p>
        ) : (
          <ul role="list" className="space-y-2">
            {rows.map((r) => {
              const snap = latestByApp.get(r.applicationId);
              const status = snap?.status ?? "INCOMPLETE";
              return (
                <li
                  key={r.applicationId}
                  data-application-id={r.applicationId}
                  className="rounded-card border border-border-subtle bg-surface-1 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold ${STATUS_STYLE[status] ?? "bg-surface-3"}`}
                    >
                      {(snap?.reasons.length ?? 0) > 0 || status !== "READY" ? status.replace(/_/g, " ") : "READY FOR HUMAN DECISION"}
                    </span>
                    <span className="min-w-0 truncate text-[14px] font-semibold">{r.candidateName}</span>
                    <span className="min-w-0 truncate text-[13px] text-text-secondary">{r.jobTitle}</span>
                  </div>
                  {snap && snap.reasons.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {snap.reasons.slice(0, 3).map((reason, i) => (
                        <li key={i} className="text-[12px] leading-relaxed text-text-secondary">
                          • {reason}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
