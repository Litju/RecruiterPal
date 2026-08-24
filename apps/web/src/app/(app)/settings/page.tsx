import { eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { getDb, integrationConnections } from "@recruiterpal/db";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await getSession(getAuth());
  if (!session) return null;
  const db = getDb();

  const connections = await db
    .select({
      provider: integrationConnections.provider,
      mode: integrationConnections.mode,
      status: integrationConnections.status,
      lastSyncedAt: integrationConnections.lastSyncedAt,
    })
    .from(integrationConnections)
    .where(eq(integrationConnections.organizationId, session.organizationId));

  return (
    <div className="flex h-full flex-col">
      <WorkspaceHeader title="Settings" subtitle="Organization, roles, policies, integrations" />
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <section aria-label="Integrations">
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">Integrations</h2>
          {connections.length === 0 ? (
            <p className="rounded-card border border-dashed border-border-subtle bg-surface-1 px-4 py-6 text-[13px] text-text-tertiary">
              Gmail / Google Calendar adapters connect here when credentials are configured;
              deterministic synthetic adapters power the demo otherwise.
            </p>
          ) : (
            <ul role="list" className="divide-y divide-border-subtle rounded-card border border-border-subtle bg-surface-1">
              {connections.map((c) => (
                <li key={c.provider} className="flex items-center justify-between px-4 py-3">
                  <span className="text-[13px] font-medium">{c.provider.replace(/_/g, " ")}</span>
                  <span className="text-[12px] text-text-secondary">
                    {c.mode.toLowerCase()} · {c.status.toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Automation policy">
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">Automation authority</h2>
          <div className="rounded-card border border-border-subtle bg-surface-1 p-4 text-[13px] leading-relaxed text-text-secondary">
            <p><strong className="text-text-primary">A1 automatic:</strong> reminders, bookkeeping, syncs.</p>
            <p><strong className="text-text-primary">A2 approval-required:</strong> rescheduling, non-template messages, substitutions.</p>
            <p><strong className="text-text-primary">A3 human-only:</strong> reject, hire, compensation, protocol changes. Pal cannot execute these under any configuration.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
