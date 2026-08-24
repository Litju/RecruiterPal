import { and, eq, count } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { getDb, jobs, applications, users } from "@recruiterpal/db";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";

export const metadata = { title: "Jobs" };

export default async function JobsPage() {
  const session = await getSession(getAuth());
  if (!session) return null;
  const db = getDb();

  const rows = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      department: jobs.department,
      status: jobs.status,
      locationMode: jobs.locationMode,
      openedAt: jobs.openedAt,
      ownerName: users.name,
      activeApplications: count(applications.id),
    })
    .from(jobs)
    .leftJoin(users, eq(users.id, jobs.ownerRecruiterId))
    .leftJoin(
      applications,
      and(eq(applications.jobId, jobs.id), eq(applications.status, "ACTIVE")),
    )
    .where(eq(jobs.organizationId, session.organizationId))
    .groupBy(jobs.id, users.name)
    .orderBy(jobs.createdAt);

  return (
    <div className="flex h-full flex-col">
      <WorkspaceHeader title="Jobs" subtitle="Requisitions, protocols, stakeholders" />
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <ul className="space-y-2" role="list">
          {rows.map((j) => (
            <li
              key={j.id}
              className="flex items-center gap-4 rounded-card border border-border-subtle bg-surface-1 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold">{j.title}</p>
                <p className="text-[12px] text-text-secondary">
                  {j.department} · {j.locationMode.toLowerCase()} · owner {j.ownerName ?? "—"}
                </p>
              </div>
              <span
                className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold ${
                  j.status === "OPEN"
                    ? "bg-success-subtle text-success"
                    : j.status === "ON_HOLD"
                      ? "bg-warning-subtle text-warning"
                      : "bg-surface-3 text-text-secondary"
                }`}
              >
                {j.status.replace(/_/g, " ")}
              </span>
              <span className="w-24 text-right text-[13px] tabular text-text-secondary">
                {j.activeApplications} active
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
