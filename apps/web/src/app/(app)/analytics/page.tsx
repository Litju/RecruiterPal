import { getAuth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { getAnalyticsSnapshot } from "@/lib/queries";
import { tenantContext } from "@/lib/tenant-db";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const session = await getSession(getAuth());
  if (!session) return null;
  const snapshot = await getAnalyticsSnapshot(tenantContext(session));

  return (
    <div className="flex h-full flex-col">
      <WorkspaceHeader
        title="Analytics"
        subtitle="Operational signals with explicit baselines and uncertainty"
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div
          className="mb-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Operational signal summary"
        >
          <div className="rounded-card border border-border-subtle bg-surface-1 p-4">
            <p className="text-[11px] uppercase tracking-wide text-text-tertiary">Time in stage</p>
            <p className="mt-1 text-2xl font-semibold tabular">
              {snapshot.timeInStage[0]?.averageHours ?? 0}h
            </p>
            <p className="text-[12px] text-text-secondary">slowest active stage average</p>
          </div>
          <div className="rounded-card border border-border-subtle bg-surface-1 p-4">
            <p className="text-[11px] uppercase tracking-wide text-text-tertiary">SLA breaches</p>
            <p className="mt-1 text-2xl font-semibold tabular">{snapshot.slaBreaches}</p>
            <p className="text-[12px] text-text-secondary">pending obligations past due</p>
          </div>
          <div className="rounded-card border border-border-subtle bg-surface-1 p-4">
            <p className="text-[11px] uppercase tracking-wide text-text-tertiary">
              Overdue scorecards
            </p>
            <p className="mt-1 text-2xl font-semibold tabular">{snapshot.overdueScorecards}</p>
            <p className="text-[12px] text-text-secondary">completed interview follow-through</p>
          </div>
          <div className="rounded-card border border-border-subtle bg-surface-1 p-4">
            <p className="text-[11px] uppercase tracking-wide text-text-tertiary">Pipeline risk</p>
            <p
              className={`mt-1 text-2xl font-semibold ${snapshot.pipelineRisk.level === "CLEAR" ? "text-success" : snapshot.pipelineRisk.level === "ELEVATED" ? "text-danger" : "text-warning"}`}
            >
              {snapshot.pipelineRisk.level}
            </p>
            <p className="text-[12px] text-text-secondary">explicit process signals only</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section
            aria-label="Time in stage and conversion"
            className="rounded-card border border-border-subtle bg-surface-1 p-4"
          >
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <h2 className="text-[14px] font-semibold">Stage flow</h2>
                <p className="mt-1 text-[12px] text-text-secondary">
                  Descriptive latency and active volume; no ranking.
                </p>
              </div>
              <span className="text-[11px] text-text-tertiary">
                {snapshot.timeInStage.length} stages
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {snapshot.timeInStage.length === 0 ? (
                <p className="text-[12px] text-text-tertiary">No active applications yet.</p>
              ) : (
                snapshot.timeInStage.map((stage) => {
                  const max = snapshot.timeInStage[0]?.applications || 1;
                  return (
                    <div key={stage.stage}>
                      <div className="flex items-center justify-between gap-3 text-[12px]">
                        <span className="font-medium">{stage.stage.replace(/_/g, " ")}</span>
                        <span className="tabular text-text-secondary">
                          {stage.applications} · {stage.averageHours}h
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-surface-3">
                        <div
                          className="h-1.5 rounded-full bg-pal"
                          style={{ width: `${Math.max(8, (stage.applications / max) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section
            aria-label="Risk signals"
            className="rounded-card border border-border-subtle bg-surface-1 p-4"
          >
            <h2 className="text-[14px] font-semibold">Pipeline signals</h2>
            <p className="mt-1 text-[12px] text-text-secondary">
              Signals explain operational pressure; they are not candidate scores.
            </p>
            <ul className="mt-4 space-y-2" role="list">
              {snapshot.pipelineRisk.signals.length === 0 ? (
                <li className="rounded-control border border-success/20 bg-success-subtle px-3 py-2 text-[12px] text-success">
                  No elevated process signals in the current portfolio.
                </li>
              ) : (
                snapshot.pipelineRisk.signals.map((signal) => (
                  <li
                    key={signal}
                    className="rounded-control border border-warning/20 bg-warning-subtle px-3 py-2 text-[12px] text-warning"
                  >
                    Needs attention: {signal}
                  </li>
                ))
              )}
            </ul>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
              <div className="rounded-control border border-border-subtle p-3">
                <dt className="text-text-tertiary">Requirement drift</dt>
                <dd className="mt-1 text-lg font-semibold tabular">{snapshot.requirementDrift}</dd>
              </div>
              <div className="rounded-control border border-border-subtle p-3">
                <dt className="text-text-tertiary">Rating disagreement</dt>
                <dd className="mt-1 text-lg font-semibold tabular">
                  {snapshot.ratingDisagreement}
                </dd>
              </div>
              <div className="rounded-control border border-border-subtle p-3">
                <dt className="text-text-tertiary">Interview capacity</dt>
                <dd className="mt-1 text-lg font-semibold tabular">{snapshot.interviewCapacity}</dd>
              </div>
              <div className="rounded-control border border-border-subtle p-3">
                <dt className="text-text-tertiary">Stage conversion rows</dt>
                <dd className="mt-1 text-lg font-semibold tabular">
                  {snapshot.stageConversion.length}
                </dd>
              </div>
            </dl>
          </section>

          <section
            aria-label="Evidence completeness"
            className="rounded-card border border-border-subtle bg-surface-1 p-4"
          >
            <h2 className="text-[14px] font-semibold">Evidence completeness</h2>
            <p className="mt-1 text-[12px] text-text-secondary">
              Readiness snapshots make missing or conflicting evidence visible.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-control border border-border-subtle p-3">
                <p className="text-[11px] text-text-tertiary">With snapshot</p>
                <p className="mt-1 text-xl font-semibold tabular">
                  {snapshot.evidenceCompleteness.applicationsWithReadiness}
                </p>
              </div>
              <div className="rounded-control border border-success/20 bg-success-subtle p-3">
                <p className="text-[11px] text-success">Ready</p>
                <p className="mt-1 text-xl font-semibold tabular text-success">
                  {snapshot.evidenceCompleteness.ready}
                </p>
              </div>
              <div className="rounded-control border border-warning/20 bg-warning-subtle p-3">
                <p className="text-[11px] text-warning">Review required</p>
                <p className="mt-1 text-xl font-semibold tabular text-warning">
                  {snapshot.evidenceCompleteness.reviewRequired}
                </p>
              </div>
            </div>
          </section>

          <section
            aria-label="Stage conversion counts"
            className="rounded-card border border-border-subtle bg-surface-1 p-4"
          >
            <h2 className="text-[14px] font-semibold">Active pipeline distribution</h2>
            <p className="mt-1 text-[12px] text-text-secondary">
              Counts are organization-scoped and current-state only.
            </p>
            <ul className="mt-4 divide-y divide-border-subtle" role="list">
              {snapshot.stageConversion.length === 0 ? (
                <li className="py-3 text-[12px] text-text-tertiary">No active applications yet.</li>
              ) : (
                snapshot.stageConversion.map((row) => (
                  <li
                    key={row.stage}
                    className="flex items-center justify-between py-2 text-[12px]"
                  >
                    <span>{row.stage.replace(/_/g, " ")}</span>
                    <span className="tabular text-text-secondary">{row.activeApplications}</span>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
