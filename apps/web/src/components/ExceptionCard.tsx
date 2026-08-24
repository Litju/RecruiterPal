import type { TodayExceptionRow } from "@/lib/queries";

const SEVERITY_STYLE: Record<string, { chip: string; label: string; icon: string }> = {
  CRITICAL: {
    chip: "bg-danger-subtle text-danger",
    label: "Critical",
    icon: "⛔",
  },
  HIGH: {
    chip: "bg-warning-subtle text-warning",
    label: "High",
    icon: "▲",
  },
  MEDIUM: {
    chip: "bg-info-subtle text-info",
    label: "Medium",
    icon: "•",
  },
  LOW: {
    chip: "bg-surface-3 text-text-secondary",
    label: "Low",
    icon: "·",
  },
};

function relativeDeadline(deadlineAt: Date | null): string | null {
  if (!deadlineAt) return null;
  const diffMs = deadlineAt.getTime() - Date.now();
  const hours = Math.round(diffMs / 3_600_000);
  if (diffMs < 0) return `overdue by ${Math.abs(hours)}h`;
  if (hours < 24) return `due in ${hours}h`;
  return `due in ${Math.round(hours / 24)}d`;
}

export function ExceptionCard({ exception }: { exception: TodayExceptionRow }) {
  const style = SEVERITY_STYLE[exception.severity] ?? SEVERITY_STYLE.LOW!;
  const deadline = relativeDeadline(exception.deadlineAt);

  return (
    <article
      data-exception-id={exception.id}
      className="rounded-card border border-border-subtle bg-surface-1 p-4 transition-shadow duration-150 hover:shadow-popover"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`mt-0.5 inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-semibold ${style.chip}`}
        >
          <span aria-hidden>{style.icon}</span>
          {style.label}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold leading-snug">{exception.title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
            {exception.detail}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-text-tertiary">
            <span className="uppercase tracking-wide">{exception.type.replace(/_/g, " ")}</span>
            {deadline ? (
              <span className="tabular" title={exception.deadlineAt?.toISOString()}>
                ⏱ {deadline}
              </span>
            ) : null}
            <span>
              Pal status:{" "}
              <span className="font-medium text-text-secondary">
                {exception.status === "WAITING_HUMAN"
                  ? "needs your decision"
                  : exception.status === "AUTO_RESOLVING"
                    ? "handling safely"
                    : exception.status.toLowerCase().replace(/_/g, " ")}
              </span>
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <button
            type="button"
            className="h-8 rounded-control bg-pal-strong px-3 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-pal"
          >
            Inspect evidence
          </button>
          <button
            type="button"
            className="h-8 rounded-control border border-border-strong px-3 text-[13px] text-text-primary transition-colors duration-150 hover:bg-surface-2"
          >
            Ask Pal why
          </button>
        </div>
      </div>
    </article>
  );
}

export function ExceptionSection({
  title,
  description,
  exceptions,
  emptyText,
}: {
  title: string;
  description?: string;
  exceptions: TodayExceptionRow[];
  emptyText?: string;
}) {
  if (exceptions.length === 0) {
    return emptyText ? (
      <section aria-label={title} className="mb-6">
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
          {title}
        </h2>
        <p className="rounded-card border border-dashed border-border-subtle bg-surface-1 px-4 py-5 text-[13px] text-text-tertiary">
          {emptyText}
        </p>
      </section>
    ) : null;
  }

  return (
    <section aria-label={title} className="mb-6">
      <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
        {title}
        <span className="ml-2 tabular text-text-tertiary">{exceptions.length}</span>
      </h2>
      {description ? (
        <p className="mb-2 text-[12px] text-text-tertiary">{description}</p>
      ) : null}
      <div className="space-y-2">
        {exceptions.map((e) => (
          <ExceptionCard key={e.id} exception={e} />
        ))}
      </div>
    </section>
  );
}
