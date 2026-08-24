export type LifecycleState =
  | "planning"
  | "executing"
  | "waiting"
  | "blocked"
  | "approval required"
  | "complete"
  | "failed";

const STATE_STYLE: Record<LifecycleState, { label: string; className: string; mark: string }> = {
  planning: { label: "Planning", className: "bg-info-subtle text-info", mark: "○" },
  executing: { label: "Executing", className: "bg-pal-subtle text-pal-text", mark: "↗" },
  waiting: { label: "Waiting", className: "bg-warning-subtle text-warning", mark: "⋯" },
  blocked: { label: "Blocked", className: "bg-danger-subtle text-danger", mark: "!" },
  "approval required": { label: "Approval required", className: "bg-info-subtle text-info", mark: "◌" },
  complete: { label: "Complete", className: "bg-success-subtle text-success", mark: "✓" },
  failed: { label: "Failed", className: "bg-danger-subtle text-danger", mark: "×" },
};

export function LifecycleBadge({ state }: { state: LifecycleState }) {
  const style = STATE_STYLE[state];
  return (
    <span
      className={`inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold ${style.className}`}
      aria-label={`Lifecycle state: ${style.label}`}
    >
      <span aria-hidden>{style.mark}</span>
      {style.label}
    </span>
  );
}
