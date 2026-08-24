import { and, desc, eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { getDb, communicationThreads, messages, extractedFacts } from "@recruiterpal/db";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";

export const metadata = { title: "Inbox" };

export default async function InboxPage() {
  const session = await getSession(getAuth());
  if (!session) return null;
  const db = getDb();

  const threads = await db
    .select()
    .from(communicationThreads)
    .where(eq(communicationThreads.organizationId, session.organizationId))
    .orderBy(desc(communicationThreads.lastMessageAt))
    .limit(50);

  const facts = await db
    .select()
    .from(extractedFacts)
    .where(and(eq(extractedFacts.organizationId, session.organizationId), eq(extractedFacts.reviewState, "UNREVIEWED")))
    .orderBy(desc(extractedFacts.createdAt))
    .limit(20);

  return (
    <div className="flex h-full flex-col">
      <WorkspaceHeader
        title="Inbox"
        subtitle="Candidate and stakeholder communication · detected facts require review"
      />
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {facts.length > 0 ? (
          <section aria-label="Detected facts needing review">
            <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
              Detected facts — review required ({facts.length})
            </h2>
            <ul role="list" className="space-y-1.5">
              {facts.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded-card border border-border-subtle bg-surface-1 px-4 py-2.5"
                >
                  <span className="text-[13px]">
                    <span className="font-medium">{f.factType.replace(/_/g, " ").toLowerCase()}</span>{" "}
                    detected from inbound message
                  </span>
                  <span className="rounded-full bg-warning-subtle px-2 py-0.5 text-[11px] font-semibold text-warning">
                    unverified
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-label="Threads">
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">Threads</h2>
          {threads.length === 0 ? (
            <p className="rounded-card border border-dashed border-border-subtle bg-surface-1 px-4 py-6 text-[13px] text-text-tertiary">
              No communication threads yet. Connect Gmail or use the synthetic adapter in Settings.
            </p>
          ) : (
            <ul role="list" className="divide-y divide-border-subtle rounded-card border border-border-subtle bg-surface-1">
              {threads.map((t) => (
                <li key={t.id} data-thread-id={t.id} className="px-4 py-3">
                  <p className="truncate text-[13px] font-medium">{t.subject ?? "(no subject)"}</p>
                  <p className="text-[12px] text-text-tertiary">
                    {t.channel.toLowerCase()} · last message{" "}
                    {t.lastMessageAt?.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
