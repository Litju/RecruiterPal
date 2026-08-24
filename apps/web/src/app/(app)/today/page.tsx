import type { Metadata } from "next";
import { getAuth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { ExceptionSection } from "@/components/ExceptionCard";
import {
  getOpenExceptions,
  getPortfolioCounts,
  groupExceptionsByPriority,
  getDeadlineApplications,
} from "@/lib/queries";
import { tenantContext } from "@/lib/tenant-db";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const session = await getSession(getAuth());
  if (!session) return null;
  const context = tenantContext(session);

  const [exceptions, counts, deadlines] = await Promise.all([
    getOpenExceptions(context),
    getPortfolioCounts(context),
    getDeadlineApplications(context),
  ]);
  const { critical, blocked, signals } = groupExceptionsByPriority(exceptions);

  const firstName = session.name.split(" ")[0];
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border-subtle bg-surface-1 px-6 py-4">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-[12px] uppercase tracking-wide text-text-secondary">{today}</p>
            <h1 className="text-lg font-semibold tracking-tight">Good to see you, {firstName}</h1>
          </div>
          <dl className="hidden items-center gap-6 text-right sm:flex" aria-label="Portfolio summary">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-text-tertiary">Open roles</dt>
              <dd className="text-lg font-semibold tabular">{counts.openJobs}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-text-tertiary">Active candidates</dt>
              <dd className="text-lg font-semibold tabular">{counts.activeApplications}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-text-tertiary">Needs you</dt>
              <dd className="text-lg font-semibold tabular text-danger">
                {critical.length + blocked.length}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <ExceptionSection
          title="Critical"
          description="Consequential time pressure. Pal prepares evidence — the decision stays yours."
          exceptions={critical}
        />
        <ExceptionSection
          title="Blocked"
          description="Work stopped or at risk of stopping."
          exceptions={blocked}
        />
        <ExceptionSection
          title="Decision ready / human input required"
          exceptions={[]}
          emptyText="No decisions are waiting on a human right now. When evidence and approvals are complete, candidates appear here for your call."
        />
        <ExceptionSection
          title="Pipeline signals"
          description="Deterministic and statistical signals — associations, not causes."
          exceptions={signals}
        />

        {deadlines.length > 0 ? (
          <section aria-label="Candidate deadlines" className="mb-6">
            <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
              Candidate deadlines
            </h2>
            <ul className="divide-y divide-border-subtle rounded-card border border-border-subtle bg-surface-1">
              {deadlines.map((d) => (
                <li key={d.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">
                      {d.candidateName} <span className="font-normal text-text-secondary">· {d.jobTitle}</span>
                    </p>
                    <p className="text-[12px] text-text-tertiary">Stage: {d.stage.replace(/_/g, " ").toLowerCase()}</p>
                  </div>
                  <span
                    className={`shrink-0 text-[12px] tabular ${
                      d.deadlineUrgent
                        ? "font-semibold text-danger"
                        : "text-text-secondary"
                    }`}
                  >
                    {d.deadlineAt?.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {d.verified === "CONFIRMED" ? "" : " · unverified"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-label="Handled by Pal while you were away" className="mb-6">
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
            Handled by Pal
          </h2>
          <p className="rounded-card border border-dashed border-border-subtle bg-surface-1 px-4 py-5 text-[13px] leading-relaxed text-text-tertiary">
            Safe administrative actions completed automatically (reminders sent,
            syncs reconciled) appear here with audit drill-down once durable
            workflows have run.
          </p>
        </section>
      </div>
    </div>
  );
}
