import { and, eq, inArray } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { withSessionTenant } from "@/lib/tenant-db";
import { applications, candidates, interviews, jobs } from "@recruiterpal/db";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { sql } from "drizzle-orm";

export const metadata = { title: "Interviews" };

export default async function InterviewsPage() {
  const session = await getSession(getAuth());
  if (!session) return null;
  const rows = await withSessionTenant(session, (tx) =>
    tx
      .select({
        id: interviews.id,
        label: interviews.label,
        status: interviews.status,
        start: interviews.scheduledStartAt,
        candidateName: sql<string>`${candidates.firstName} || ' ' || ${candidates.lastName}`,
        jobTitle: jobs.title,
      })
      .from(interviews)
      .innerJoin(applications, eq(applications.id, interviews.applicationId))
      .innerJoin(candidates, eq(candidates.id, applications.candidateId))
      .innerJoin(jobs, eq(jobs.id, interviews.jobId))
      .where(
        and(
          eq(interviews.organizationId, session.organizationId),
          inArray(interviews.status, [
            "PLANNED",
            "AWAITING_AVAILABILITY",
            "SCHEDULED",
            "RESCHEDULE_REQUIRED",
          ]),
        ),
      )
      .orderBy(interviews.scheduledStartAt)
      .limit(200),
  );

  return (
    <div className="flex h-full flex-col">
      <WorkspaceHeader title="Interviews" subtitle="Schedule, queue, scorecard completion" />
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <ul role="list" className="space-y-2">
          {rows.map((i) => (
            <li
              key={i.id}
              data-interview-id={i.id}
              className="flex items-center gap-4 rounded-card border border-border-subtle bg-surface-1 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">
                  {i.candidateName}{" "}
                  <span className="font-normal text-text-secondary">· {i.label}</span>
                </p>
                <p className="text-[12px] text-text-tertiary">{i.jobTitle}</p>
              </div>
              <time className="shrink-0 text-[13px] tabular text-text-secondary">
                {i.start
                  ? i.start.toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "unscheduled"}
              </time>
              <span className="w-36 shrink-0 text-right text-[12px] font-medium text-info">
                {i.status.replace(/_/g, " ")}
              </span>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="rounded-card border border-dashed border-border-subtle px-4 py-6 text-[13px] text-text-tertiary">
              No upcoming interviews.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
