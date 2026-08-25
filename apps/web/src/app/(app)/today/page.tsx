import type { Metadata } from "next";
import { getAuth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { ExceptionSection } from "@/components/ExceptionCard";
import {
  getOpenExceptions,
  getPortfolioCounts,
  groupExceptionsByPriority,
  getDeadlineApplications,
  getTodayExecutionSnapshot,
} from "@/lib/queries";
import { tenantContext } from "@/lib/tenant-db";
import { PalPane } from "@/components/PalPane";
import { providerQualificationState } from "@recruiterpal/agent-runtime";
import Link from "next/link";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage({
  searchParams,
}: {
  searchParams?: Promise<{
    intent?: string | string[];
    pal?: string | string[];
    candidate?: string | string[];
  }>;
}) {
  const session = await getSession(getAuth());
  if (!session) return null;
  const params = (await searchParams) ?? {};
  const context = tenantContext(session);

  const [exceptions, counts, deadlines, execution] = await Promise.all([
    getOpenExceptions(context),
    getPortfolioCounts(context),
    getDeadlineApplications(context),
    getTodayExecutionSnapshot(context),
  ]);
  const { critical, blocked, signals } = groupExceptionsByPriority(exceptions);

  const firstName = session.name.split(" ")[0];
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const provider = providerQualificationState();
  const intent = typeof params.intent === "string" ? params.intent : undefined;
  const candidateId = typeof params.candidate === "string" ? params.candidate : undefined;
  const requestedPrompt = typeof params.pal === "string" ? params.pal : undefined;
  const initialPrompt =
    requestedPrompt === "candidate-readiness"
      ? "Explain the decision readiness for the selected candidate. Use the current evidence, scorecards, conflicts, and missing requirements; keep the final employment decision with a human."
      : requestedPrompt;

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border-subtle bg-surface-1 px-6 py-4">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-[12px] uppercase tracking-wide text-text-secondary">{today}</p>
            <h1 className="text-lg font-semibold tracking-tight">Good to see you, {firstName}</h1>
          </div>
          <dl
            className="hidden items-center gap-6 text-right sm:flex"
            aria-label="Portfolio summary"
          >
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-text-tertiary">Open roles</dt>
              <dd className="text-lg font-semibold tabular">{counts.openJobs}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-text-tertiary">
                Active candidates
              </dt>
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
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <main className="min-w-0">
            <section
              aria-label="Execution summary"
              className="mb-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
            >
              <div className="rounded-card border border-border-subtle bg-surface-1 p-3">
                <p className="text-[11px] uppercase tracking-wide text-text-tertiary">
                  Decision ready
                </p>
                <p className="mt-1 text-xl font-semibold tabular">{execution.readinessReady}</p>
                <p className="text-[12px] text-text-secondary">human review only</p>
              </div>
              <div className="rounded-card border border-border-subtle bg-surface-1 p-3">
                <p className="text-[11px] uppercase tracking-wide text-text-tertiary">
                  Pending obligations
                </p>
                <p className="mt-1 text-xl font-semibold tabular">{execution.pendingObligations}</p>
                <p
                  className={`text-[12px] ${execution.overdueObligations > 0 ? "text-danger" : "text-text-secondary"}`}
                >
                  {execution.overdueObligations} overdue
                </p>
              </div>
              <div className="rounded-card border border-border-subtle bg-surface-1 p-3">
                <p className="text-[11px] uppercase tracking-wide text-text-tertiary">
                  Needs review
                </p>
                <p className="mt-1 text-xl font-semibold tabular">{execution.readinessReview}</p>
                <p className="text-[12px] text-text-secondary">evidence or approval gap</p>
              </div>
              <div className="rounded-card border border-border-subtle bg-surface-1 p-3">
                <p className="text-[11px] uppercase tracking-wide text-text-tertiary">
                  Durable workflows
                </p>
                <p className="mt-1 text-xl font-semibold tabular">{execution.activeWorkflows}</p>
                <p className="text-[12px] text-text-secondary">resumable and audited</p>
              </div>
            </section>

            <ExceptionSection
              title="Critical"
              description="Consequential time pressure. RecruiterPal prepares evidence — the decision stays yours."
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
              emptyText={
                execution.readinessReady > 0
                  ? `${execution.readinessReady} readiness snapshot(s) are ready for a human decision in Decisions.`
                  : "No decisions are waiting on a human right now. When evidence and approvals are complete, candidates appear here for your call."
              }
            />
            <ExceptionSection
              title="Pipeline signals"
              description="Deterministic and statistical signals — associations, not causes."
              exceptions={signals}
            />

            {deadlines.length > 0 ? (
              <section aria-label="Candidate deadlines" className="mb-6">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <div>
                    <h2 className="text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
                      Candidate deadlines
                    </h2>
                    <p className="mt-1 text-[12px] text-text-tertiary">
                      Verified deadlines shape urgency; they never decide an outcome.
                    </p>
                  </div>
                  <Link
                    href="/candidates"
                    className="text-[12px] font-medium text-pal-text hover:underline"
                  >
                    Open workspaces
                  </Link>
                </div>
                <ul className="divide-y divide-border-subtle rounded-card border border-border-subtle bg-surface-1">
                  {deadlines.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium">
                          {d.candidateName}{" "}
                          <span className="font-normal text-text-secondary">· {d.jobTitle}</span>
                        </p>
                        <p className="text-[12px] text-text-tertiary">
                          Stage: {d.stage.replace(/_/g, " ").toLowerCase()}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-right text-[12px] tabular ${d.deadlineUrgent ? "font-semibold text-danger" : "text-text-secondary"}`}
                      >
                        {d.deadlineAt?.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                        {d.verified === "CONFIRMED" ? "" : " · unverified"}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section aria-label="Handled by RecruiterPal while you were away" className="mb-6">
              <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
                Handled by RecruiterPal
              </h2>
              {execution.automatedActivity.length === 0 ? (
                <p className="rounded-card border border-dashed border-border-subtle bg-surface-1 px-4 py-5 text-[13px] leading-relaxed text-text-tertiary">
                  Safe administrative actions completed automatically (reminders sent, syncs
                  reconciled) appear here with audit drill-down once durable workflows have run.
                </p>
              ) : (
                <ol
                  className="space-y-2 rounded-card border border-border-subtle bg-surface-1 p-3"
                  aria-label="Recent RecruiterPal and workflow activity"
                >
                  {execution.automatedActivity.map((activity) => (
                    <li
                      key={activity.id}
                      className="flex items-start gap-3 border-l-2 border-pal/40 pl-3 text-[12px]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {activity.actionType.replace(/_/g, " ").toLowerCase()}
                        </p>
                        <p className="text-text-tertiary">
                          {activity.actorType.toLowerCase()} · {activity.targetType.toLowerCase()} ·{" "}
                          {activity.outcome.toLowerCase()}
                        </p>
                      </div>
                      <time className="shrink-0 tabular text-text-tertiary">
                        {activity.occurredAt.toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </time>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </main>

          <PalPane
            provider={{ configured: provider.configured, model: provider.model }}
            contextLabel="Northstar Labs · recruiting portfolio"
            activeExceptions={exceptions.length}
            criticalExceptions={critical.length}
            deadlineCount={deadlines.length}
            pendingObligations={execution.pendingObligations}
            overdueObligations={execution.overdueObligations}
            readinessReady={execution.readinessReady}
            readinessReview={execution.readinessReview}
            activeWorkflows={execution.activeWorkflows}
            automatedActivity={execution.automatedActivity.map((activity) => ({
              ...activity,
              occurredAt: activity.occurredAt.toISOString(),
            }))}
            intent={intent}
            initialPrompt={initialPrompt}
            initialPromptContext={
              candidateId ? { entityType: "candidate", entityId: candidateId } : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
