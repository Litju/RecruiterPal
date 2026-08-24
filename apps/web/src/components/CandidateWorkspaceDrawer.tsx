"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { LifecycleBadge } from "@/components/LifecycleBadge";

export interface CandidateListRow {
  id: string;
  name: string;
  headline: string | null;
  source: string | null;
  createdAt: string;
}

interface WorkspaceData {
  candidate: { id: string; firstName: string; lastName: string; headline: string | null; source: string | null };
  applications: Array<{ id: string; status: string; stage: string; candidateDeadlineAt: string | null; deadlineVerified: string | null; lastActivityAt: string; jobTitle: string }>;
  evidence: Array<{ id: string; applicationId: string; competencyId: string; competency: string; observation: string; rating: number | null; sourceType: string; provenance: string; observedAt: string }>;
  scorecards: Array<{ id: string; applicationId: string; interviewId: string; raterUserId: string; status: string; submittedAt: string | null }>;
  ratings: Array<{ scorecardId: string; competencyId: string; competency: string; rating: number; evidenceNote: string | null; rubricAnchor: string | null }>;
  readiness: Array<{ id: string; applicationId: string; status: string; reasons: string[]; computedAt: string }>;
  timeline: Array<{ id: string; applicationId: string; fromStage: string | null; toStage: string; reason: string | null; actorType: string; occurredAt: string }>;
}

const READINESS_STYLE: Record<string, string> = {
  READY: "bg-success-subtle text-success",
  INCOMPLETE: "bg-warning-subtle text-warning",
  CONFLICT_REVIEW_REQUIRED: "bg-danger-subtle text-danger",
  APPROVAL_REQUIRED: "bg-info-subtle text-info",
  STALE: "bg-surface-3 text-text-secondary",
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
}

export function CandidateWorkspaceDrawer({ rows }: { rows: CandidateListRow[] }) {
  const reducedMotion = useReducedMotion();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCandidate = (candidateId: string) => {
    setData(null);
    setLoading(true);
    setError(null);
    setSelectedId(candidateId);
  };

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    fetch(`/api/candidates/${selectedId}`, { headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load candidate workspace.");
        return response.json() as Promise<WorkspaceData>;
      })
      .then((workspace) => {
        if (!cancelled) setData(workspace);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load candidate workspace.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);

  return (
    <>
      <ul role="list" className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
        {rows.map((candidate) => (
          <li key={candidate.id} data-candidate-id={candidate.id} className="rounded-card border border-border-subtle bg-surface-1 px-4 py-3 transition-shadow hover:shadow-popover">
            <button type="button" onClick={() => openCandidate(candidate.id)} className="w-full text-left">
              <span className="block truncate text-[14px] font-semibold">{candidate.name}</span>
              <span className="block truncate text-[12px] text-text-secondary">{candidate.headline ?? "No headline recorded"}</span>
              <span className="mt-1 block text-[11px] uppercase tracking-wide text-text-tertiary">source: {(candidate.source ?? "unknown").toLowerCase().replace(/_/g, " ")} · open workspace</span>
            </button>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {selectedId ? (
          <div className="fixed inset-0 z-40 flex justify-end bg-black/20" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}>
            <motion.aside
              data-candidate-drawer
              role="dialog"
              aria-modal="true"
              aria-label="Candidate workspace"
              initial={{ opacity: 0, x: reducedMotion ? 0 : 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reducedMotion ? 0 : 24 }}
              transition={{ duration: reducedMotion ? 0 : 0.2 }}
              className="flex h-full w-full max-w-3xl flex-col border-l border-border-strong bg-canvas shadow-drawer"
            >
              <header className="flex items-start justify-between gap-4 border-b border-border-subtle bg-surface-1 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-pal-text">Candidate workspace</p>
                  <h2 className="mt-1 truncate text-lg font-semibold">{data ? `${data.candidate.firstName} ${data.candidate.lastName}` : "Loading workspace"}</h2>
                  <p className="text-[12px] text-text-secondary">Evidence, protocol context, readiness, and execution history</p>
                </div>
                <button type="button" onClick={() => setSelectedId(null)} className="grid size-8 shrink-0 place-items-center rounded-control border border-border-subtle hover:bg-surface-2" aria-label="Close candidate workspace"><X className="size-4" aria-hidden /></button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {loading ? <p className="rounded-card border border-border-subtle bg-surface-1 px-4 py-6 text-[13px] text-text-secondary">Loading tenant-scoped evidence…</p> : null}
                {error ? <p role="alert" className="rounded-card border border-danger/30 bg-danger-subtle px-4 py-6 text-[13px] text-danger">{error}</p> : null}
                {data ? (
                  <div className="space-y-5">
                    <section aria-label="Candidate context" className="rounded-card border border-border-subtle bg-surface-1 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div><p className="text-[13px] font-semibold">{data.candidate.headline ?? "No headline recorded"}</p><p className="mt-1 text-[12px] text-text-secondary">Source: {(data.candidate.source ?? "unknown").toLowerCase().replace(/_/g, " ")}</p></div>
                        <Link href={`/today?intent=readiness-review&candidate=${data.candidate.id}`} className="inline-flex items-center gap-1.5 rounded-control bg-pal-strong px-3 py-2 text-[12px] font-medium text-white hover:bg-pal">Ask Pal to explain <ArrowUpRight className="size-3.5" aria-hidden /></Link>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {data.applications.map((application) => {
                          const readiness = data.readiness.find((snapshot) => snapshot.applicationId === application.id);
                          return <div key={application.id} className="rounded-control border border-border-subtle bg-surface-2 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[12px] font-medium">{application.jobTitle}</span><span className="text-[11px] text-text-tertiary">{application.status.toLowerCase()}</span></div><p className="mt-1 text-[12px] text-text-secondary">{application.stage.replace(/_/g, " ").toLowerCase()}</p><div className="mt-2 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${READINESS_STYLE[readiness?.status ?? "INCOMPLETE"] ?? "bg-surface-3 text-text-secondary"}`}>{readiness?.status?.replace(/_/g, " ") ?? "NO SNAPSHOT"}</span><span className="text-[11px] text-text-tertiary">deadline {formatDate(application.candidateDeadlineAt)}</span></div></div>;
                        })}
                      </div>
                    </section>

                    <section aria-label="Decision readiness" className="rounded-card border border-border-subtle bg-surface-1 p-4">
                      <div className="flex items-center justify-between gap-3"><div><h3 className="text-[14px] font-semibold">Decision readiness</h3><p className="mt-1 text-[12px] text-text-secondary">A deterministic process state, never a candidate score.</p></div><LifecycleBadge state={data.readiness.some((snapshot) => snapshot.status === "READY") ? "approval required" : "blocked"} /></div>
                      <div className="mt-3 space-y-2">{data.readiness.length === 0 ? <p className="text-[12px] text-text-tertiary">No readiness snapshot has been computed yet.</p> : data.readiness.map((snapshot) => <div key={snapshot.id} className="rounded-control border border-border-subtle bg-surface-2 p-3"><div className="flex items-center justify-between gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${READINESS_STYLE[snapshot.status] ?? "bg-surface-3 text-text-secondary"}`}>{snapshot.status.replace(/_/g, " ")}</span><time className="text-[11px] tabular text-text-tertiary">{formatDate(snapshot.computedAt)}</time></div>{snapshot.reasons.length > 0 ? <ul className="mt-2 space-y-1">{snapshot.reasons.slice(0, 4).map((reason) => <li key={reason} className="text-[12px] text-text-secondary">• {reason}</li>)}</ul> : <p className="mt-2 text-[12px] text-success">All deterministic readiness checks passed; a human still owns the decision.</p>}</div>)}</div>
                    </section>

                    <section aria-label="Evidence matrix" className="rounded-card border border-border-subtle bg-surface-1 p-4">
                      <div className="flex items-baseline justify-between gap-3"><div><h3 className="text-[14px] font-semibold">Evidence matrix</h3><p className="mt-1 text-[12px] text-text-secondary">Observed facts retain source, provenance, and timestamp.</p></div><span className="text-[11px] tabular text-text-tertiary">{data.evidence.length} observations</span></div>
                      {data.evidence.length === 0 ? <p className="mt-3 rounded-control border border-dashed border-border-subtle px-3 py-4 text-[12px] text-text-tertiary">No evidence observations recorded.</p> : <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-[12px]"><thead className="border-b border-border-subtle text-[10px] uppercase tracking-wide text-text-tertiary"><tr><th className="pb-2 pr-3 font-semibold">Competency</th><th className="pb-2 pr-3 font-semibold">Observation</th><th className="pb-2 pr-3 font-semibold">Source</th><th className="pb-2 pr-3 font-semibold">Rating</th><th className="pb-2 font-semibold">Provenance</th></tr></thead><tbody className="divide-y divide-border-subtle">{data.evidence.map((evidence) => <tr key={evidence.id}><td className="py-2 pr-3 font-medium">{evidence.competency}</td><td className="max-w-[260px] py-2 pr-3 text-text-secondary">{evidence.observation}</td><td className="py-2 pr-3 text-text-tertiary">{evidence.sourceType.replace(/_/g, " ").toLowerCase()}</td><td className="py-2 pr-3 tabular">{evidence.rating ?? "—"}</td><td className="py-2 text-text-tertiary">{evidence.provenance.toLowerCase().replace(/_/g, " ")}</td></tr>)}</tbody></table></div>}
                    </section>

                    <section aria-label="Scorecard comparison" className="rounded-card border border-border-subtle bg-surface-1 p-4"><div className="flex items-baseline justify-between gap-3"><div><h3 className="text-[14px] font-semibold">Scorecard comparison</h3><p className="mt-1 text-[12px] text-text-secondary">Side-by-side ratings make disagreement visible; Pal cannot resolve it by itself.</p></div><span className="text-[11px] tabular text-text-tertiary">{data.scorecards.length} scorecards</span></div>{data.scorecards.length === 0 ? <p className="mt-3 rounded-control border border-dashed border-border-subtle px-3 py-4 text-[12px] text-text-tertiary">No scorecards are attached yet.</p> : <div className="mt-3 grid gap-2 sm:grid-cols-2">{data.scorecards.map((scorecard) => <article key={scorecard.id} className="rounded-control border border-border-subtle bg-surface-2 p-3"><div className="flex items-center justify-between gap-2"><p className="text-[12px] font-medium">Rater {scorecard.raterUserId.slice(0, 8)}</p><span className="text-[10px] font-semibold uppercase text-text-secondary">{scorecard.status.toLowerCase()}</span></div><p className="mt-1 text-[11px] text-text-tertiary">submitted {formatDate(scorecard.submittedAt)}</p><ul className="mt-2 space-y-1">{data.ratings.filter((rating) => rating.scorecardId === scorecard.id).map((rating) => <li key={`${scorecard.id}-${rating.competencyId}`} className="flex items-center justify-between gap-2 text-[12px]"><span className="truncate text-text-secondary">{rating.competency}</span><span className="tabular font-semibold">{rating.rating}</span></li>)}</ul></article>)}</div>}</section>

                    <section aria-label="Execution timeline" className="rounded-card border border-border-subtle bg-surface-1 p-4"><h3 className="text-[14px] font-semibold">Execution timeline</h3><p className="mt-1 text-[12px] text-text-secondary">Stage events are append-only and actor-labeled.</p>{data.timeline.length === 0 ? <p className="mt-3 text-[12px] text-text-tertiary">No stage events recorded yet.</p> : <ol className="mt-3 space-y-3 border-l border-border-subtle pl-4">{data.timeline.map((event) => <li key={event.id} className="relative"><span className="absolute -left-[21px] top-1 size-2 rounded-full border-2 border-canvas bg-border-strong" aria-hidden /><p className="text-[12px] font-medium">{event.fromStage ? `${event.fromStage.replace(/_/g, " ")} → ` : "Entered "}{event.toStage.replace(/_/g, " ")}</p><p className="mt-1 text-[11px] text-text-tertiary">{event.actorType.toLowerCase()} · {formatDate(event.occurredAt)}{event.reason ? ` · ${event.reason}` : ""}</p></li>)}</ol>}</section>
                  </div>
                ) : null}
              </div>
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
