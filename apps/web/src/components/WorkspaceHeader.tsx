export function WorkspaceHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-border-subtle bg-surface-1 px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="text-[13px] text-text-secondary">{subtitle}</p> : null}
        </div>
        {children}
      </div>
    </header>
  );
}

export function EmptySurface({ message }: { message: string }) {
  return (
    <p className="rounded-card border border-dashed border-border-subtle bg-surface-1 px-4 py-6 text-[13px] text-text-tertiary">
      {message}
    </p>
  );
}
