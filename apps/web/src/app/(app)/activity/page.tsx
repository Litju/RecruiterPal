import { and, desc, eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { withSessionTenant } from "@/lib/tenant-db";
import { auditRecords } from "@recruiterpal/db";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";

export const metadata = { title: "Activity" };

const ACTOR_STYLE: Record<string, string> = {
  HUMAN: "bg-info-subtle text-info",
  AGENT: "bg-pal-subtle text-pal-text",
  WORKFLOW: "bg-success-subtle text-success",
  INTEGRATION: "bg-surface-3 text-text-secondary",
};

export default async function ActivityPage() {
  const session = await getSession(getAuth());
  if (!session) return null;
  const records = await withSessionTenant(session, (tx) =>
    tx
      .select()
      .from(auditRecords)
      .where(eq(auditRecords.organizationId, session.organizationId))
      .orderBy(desc(auditRecords.occurredAt))
      .limit(200),
  );

  return (
    <div className="flex h-full flex-col">
      <WorkspaceHeader
        title="Activity"
        subtitle="Append-only audit ledger — every material action is traceable"
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {records.length === 0 ? (
          <p className="rounded-card border border-dashed border-border-subtle bg-surface-1 px-4 py-6 text-[13px] text-text-tertiary">
            No audit records yet.
          </p>
        ) : (
          <ol role="list" className="relative space-y-0 border-l border-border-subtle pl-5">
            {records.map((r) => (
              <li key={r.id} className="relative py-2.5" data-audit-id={r.id}>
                <span
                  aria-hidden
                  className="absolute -left-[26px] top-4 size-2 rounded-full border-2 border-canvas bg-border-strong"
                />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span
                    className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-bold tracking-wide ${ACTOR_STYLE[r.actorType] ?? ""}`}
                  >
                    {r.actorType}
                  </span>
                  <span className="text-[13px] font-medium">{r.actionType}</span>
                  <span className="text-[12px] text-text-secondary">
                    → {r.targetType} {r.targetId.slice(0, 8)}…
                  </span>
                  <span className="text-[11px] uppercase tracking-wide text-text-tertiary">
                    {r.authorityClass} · policy {r.policyVersion}
                  </span>
                  <time className="ml-auto text-[12px] tabular text-text-tertiary">
                    {r.occurredAt.toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                {r.outcome !== "SUCCEEDED" ? (
                  <p className="mt-1 text-[12px] text-danger">outcome: {r.outcome.toLowerCase()}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
