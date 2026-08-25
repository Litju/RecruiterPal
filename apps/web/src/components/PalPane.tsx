"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEveAgent, type EveMessage } from "eve/react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Bot, ShieldCheck } from "lucide-react";
import { LifecycleBadge } from "@/components/LifecycleBadge";
import {
  PAL_PROMPT_EVENT,
  type PalPromptContext,
  type PalPromptDetail,
} from "@/components/pal-events";

export interface PalPaneActivity {
  id: string;
  actorType: string;
  actionType: string;
  targetType: string;
  outcome: string;
  occurredAt: string;
}

export interface PalPaneProps {
  provider: { configured: boolean; model: string };
  contextLabel: string;
  activeExceptions: number;
  criticalExceptions: number;
  deadlineCount: number;
  pendingObligations: number;
  overdueObligations: number;
  readinessReady: number;
  readinessReview: number;
  activeWorkflows: number;
  automatedActivity: PalPaneActivity[];
  intent?: string;
  initialPrompt?: string;
  initialPromptContext?: PalPromptContext;
}

const INTENT_COPY: Record<string, string> = {
  "readiness-review":
    "Review decision readiness and surface the human calls that are actually ready.",
  "scorecard-chase":
    "Find overdue scorecards, send only idempotent reminders, and escalate continued absence.",
  "scheduling-resolution":
    "Inspect participant availability and prepare a scheduling proposal without writing to a calendar.",
};

export function PalPane(props: PalPaneProps) {
  const reducedMotion = useReducedMotion();
  const [showTimeline, setShowTimeline] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const initialPromptSent = useRef<string | null>(null);
  const agent = useEveAgent();
  const busy = agent.status === "submitted" || agent.status === "streaming";
  const intentCopy = props.intent ? INTENT_COPY[props.intent] : undefined;
  const lifecycle = !props.provider.configured
    ? "blocked"
    : agent.status === "error"
      ? "failed"
      : busy
        ? "executing"
        : "waiting";

  const sendPrompt = useCallback(
    async (prompt: string, context?: PalPromptDetail["context"]) => {
      const message = prompt.trim();
      if (!message || !props.provider.configured) return;
      setChatOpen(true);
      setLocalError(null);
      try {
        await agent.send(message, {
          clientContext: {
            surface: "today",
            contextLabel: props.contextLabel,
            selectedEntity: context ? JSON.stringify(context) : "none",
            portfolioSignals: {
              activeExceptions: props.activeExceptions,
              criticalExceptions: props.criticalExceptions,
              deadlineCount: props.deadlineCount,
              pendingObligations: props.pendingObligations,
              overdueObligations: props.overdueObligations,
              readinessReady: props.readinessReady,
              readinessReview: props.readinessReview,
              activeWorkflows: props.activeWorkflows,
            },
          },
        });
      } catch (error) {
        setLocalError(error instanceof Error ? error.message : "RecruiterPal could not answer.");
      }
    },
    [
      agent,
      props.activeExceptions,
      props.activeWorkflows,
      props.contextLabel,
      props.criticalExceptions,
      props.deadlineCount,
      props.overdueObligations,
      props.pendingObligations,
      props.provider.configured,
      props.readinessReady,
      props.readinessReview,
    ],
  );

  useEffect(() => {
    const onPrompt = (event: Event) => {
      const detail = (event as CustomEvent<PalPromptDetail>).detail;
      if (detail?.prompt) void sendPrompt(detail.prompt, detail.context);
    };
    window.addEventListener(PAL_PROMPT_EVENT, onPrompt);
    return () => window.removeEventListener(PAL_PROMPT_EVENT, onPrompt);
  }, [sendPrompt]);

  useEffect(() => {
    if (!props.initialPrompt || initialPromptSent.current === props.initialPrompt) return;
    initialPromptSent.current = props.initialPrompt;
    void sendPrompt(props.initialPrompt, props.initialPromptContext);
  }, [props.initialPrompt, props.initialPromptContext, sendPrompt]);

  const submitDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    setDraft("");
    void sendPrompt(message);
  };

  const messageText = (message: EveMessage) =>
    message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("")
      .trim();

  return (
    <motion.aside
      aria-label="RecruiterPal contextual execution pane"
      initial={{ opacity: 0, x: reducedMotion ? 0 : 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.2 }}
      className="rounded-overlay border border-pal/25 bg-surface-1 p-4 shadow-popover"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-card bg-pal-subtle text-pal-text">
            <Bot className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-[14px] font-semibold">RecruiterPal</p>
            <p className="text-[11px] text-text-secondary">Execution partner</p>
          </div>
        </div>
        <LifecycleBadge state={lifecycle} />
      </div>

      <div className="mt-4 rounded-card border border-border-subtle bg-surface-2 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-pal-text">
          Current context
        </p>
        <p className="mt-1 text-[13px] font-medium">{props.contextLabel}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
          RecruiterPal is grounded in this organization, its permissions, current work, evidence,
          and durable workflow state.
        </p>
      </div>

      {intentCopy ? (
        <AnimatePresence initial={false}>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: reducedMotion ? 0 : 0.16 }}
            className="mt-3 overflow-hidden rounded-card border border-pal/25 bg-pal-subtle p-3"
          >
            <p className="text-[11px] font-semibold text-pal-text">Requested intent</p>
            <p className="mt-1 text-[12px] leading-relaxed text-text-primary">{intentCopy}</p>
          </motion.div>
        </AnimatePresence>
      ) : null}

      <dl
        className="mt-4 grid grid-cols-2 gap-2"
        aria-label="RecruiterPal execution context counts"
      >
        <div className="rounded-card border border-border-subtle p-2.5">
          <dt className="text-[10px] uppercase tracking-wide text-text-tertiary">
            Needs attention
          </dt>
          <dd className="mt-1 text-lg font-semibold tabular">{props.activeExceptions}</dd>
        </div>
        <div className="rounded-card border border-border-subtle p-2.5">
          <dt className="text-[10px] uppercase tracking-wide text-text-tertiary">Deadlines</dt>
          <dd className="mt-1 text-lg font-semibold tabular">{props.deadlineCount}</dd>
        </div>
        <div className="rounded-card border border-border-subtle p-2.5">
          <dt className="text-[10px] uppercase tracking-wide text-text-tertiary">
            Readiness review
          </dt>
          <dd className="mt-1 text-lg font-semibold tabular">{props.readinessReview}</dd>
        </div>
        <div className="rounded-card border border-border-subtle p-2.5">
          <dt className="text-[10px] uppercase tracking-wide text-text-tertiary">
            Active workflows
          </dt>
          <dd className="mt-1 text-lg font-semibold tabular">{props.activeWorkflows}</dd>
        </div>
      </dl>

      <div
        className={`mt-4 rounded-card border p-3 ${props.provider.configured ? "border-success/30 bg-success-subtle" : "border-warning/30 bg-warning-subtle"}`}
      >
        <div className="flex items-start gap-2">
          {props.provider.configured ? (
            <ShieldCheck className="mt-0.5 size-4 text-success" aria-hidden />
          ) : (
            <span className="mt-0.5 text-warning" aria-hidden>
              !
            </span>
          )}
          <div>
            <p className="text-[12px] font-semibold">
              {props.provider.configured ? "Model runtime ready" : "Model runtime paused"}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
              {props.provider.configured
                ? `${props.provider.model} is available through the server-only Eve adapter.`
                : `Add OPENCODE_GO_API_KEY on the server to enable ${props.provider.model}. Deterministic reads and workflows remain available; no external write was attempted.`}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
            Recommended actions
          </p>
          <span className="text-[11px] text-text-tertiary">human authority stays explicit</span>
        </div>
        <div className="mt-2 space-y-1.5">
          <Link
            href="/decisions"
            className="flex items-center justify-between rounded-control border border-border-subtle px-3 py-2 text-[12px] transition-colors hover:bg-surface-2"
          >
            <span>Review decision readiness</span>
            <ArrowUpRight className="size-3.5 text-pal-text" aria-hidden />
          </Link>
          <Link
            href="/interviews?intent=scorecard-chase"
            className="flex items-center justify-between rounded-control border border-border-subtle px-3 py-2 text-[12px] transition-colors hover:bg-surface-2"
          >
            <span>Inspect scorecard chase</span>
            <ArrowUpRight className="size-3.5 text-pal-text" aria-hidden />
          </Link>
          <Link
            href="/activity"
            className="flex items-center justify-between rounded-control border border-border-subtle px-3 py-2 text-[12px] transition-colors hover:bg-surface-2"
          >
            <span>Open execution timeline</span>
            <ArrowUpRight className="size-3.5 text-pal-text" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="mt-4 border-t border-border-subtle pt-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
              Ask RecruiterPal
            </p>
            <p className="mt-1 text-[11px] text-text-tertiary">
              Ask about the current portfolio, exception, evidence, or safe next step.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setChatOpen((value) => !value)}
            className="rounded-control border border-border-subtle px-2 py-1 text-[11px] text-text-secondary hover:bg-surface-2"
            aria-expanded={chatOpen}
          >
            {chatOpen ? "Hide" : "Open"}
          </button>
        </div>

        {chatOpen ? (
          <>
            <div
              aria-live="polite"
              className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-card border border-border-subtle bg-surface-2 p-2.5"
            >
              {agent.data.messages.length === 0 ? (
                <p className="text-[12px] leading-relaxed text-text-secondary">
                  Start with a question. RecruiterPal will explain the evidence and keep
                  consequential decisions with you.
                </p>
              ) : (
                agent.data.messages.map((message) => {
                  const text = messageText(message);
                  if (!text) return null;
                  return (
                    <div
                      key={message.id}
                      className={`rounded-control px-2.5 py-2 text-[12px] leading-relaxed ${message.role === "assistant" ? "bg-pal-subtle text-text-primary" : "bg-surface-1 text-text-secondary"}`}
                    >
                      <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                        {message.role === "assistant" ? "RecruiterPal" : "You"}
                      </p>
                      <p className="whitespace-pre-wrap">{text}</p>
                    </div>
                  );
                })
              )}
              {busy ? <p className="text-[11px] text-pal-text">RecruiterPal is working…</p> : null}
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                "Why is this blocked?",
                "Inspect the evidence",
                "What is the safest next step?",
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={!props.provider.configured || busy}
                  onClick={() => void sendPrompt(prompt)}
                  className="rounded-control border border-pal/25 px-2 py-1 text-[11px] text-pal-text transition-colors hover:bg-pal-subtle disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form className="mt-2 flex items-end gap-2" onSubmit={submitDraft}>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={2}
                disabled={!props.provider.configured || busy}
                placeholder={
                  props.provider.configured
                    ? "Ask RecruiterPal anything about this work…"
                    : "RecruiterPal is unavailable until the server provider is configured."
                }
                className="min-h-12 min-w-0 flex-1 resize-none rounded-control border border-border-strong bg-surface-1 px-2.5 py-2 text-[12px] outline-none placeholder:text-text-tertiary focus:border-pal disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Ask RecruiterPal"
              />
              <button
                type="submit"
                disabled={!props.provider.configured || busy || draft.trim().length === 0}
                className="h-9 rounded-control bg-pal-strong px-3 text-[12px] font-medium text-white transition-colors hover:bg-pal disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </form>
            <p className="mt-1 text-[10px] text-text-tertiary">Ctrl/Cmd + Enter to send</p>
            {localError || agent.error ? (
              <p role="alert" className="mt-2 text-[11px] text-danger">
                {localError ?? "RecruiterPal could not complete that request. Try again."}
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="mt-4 border-t border-border-subtle pt-3">
        <button
          type="button"
          onClick={() => setShowTimeline((value) => !value)}
          className="flex w-full items-center justify-between text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary"
        >
          <span>RecruiterPal-completed work</span>
          <span aria-hidden>{showTimeline ? "−" : "+"}</span>
        </button>
        {showTimeline ? (
          <ul className="mt-2 space-y-2" role="list">
            {props.automatedActivity.length === 0 ? (
              <li className="text-[12px] text-text-tertiary">No automated work recorded yet.</li>
            ) : (
              props.automatedActivity.map((activity) => (
                <li key={activity.id} className="border-l-2 border-pal/40 pl-2.5 text-[12px]">
                  <p className="font-medium">
                    {activity.actionType.replace(/_/g, " ").toLowerCase()}
                  </p>
                  <p className="mt-0.5 text-text-tertiary">
                    {activity.actorType.toLowerCase()} · {activity.outcome.toLowerCase()} ·{" "}
                    {new Date(activity.occurredAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </motion.aside>
  );
}
