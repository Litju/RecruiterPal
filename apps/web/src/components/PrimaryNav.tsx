"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartNoAxesColumn,
  Inbox,
  ListChecks,
  Radar,
  ScrollText,
  Settings,
  Sparkles,
  Users,
  Briefcase,
} from "lucide-react";
import type { ComponentType } from "react";

export interface NavCounts {
  critical?: number;
  pendingApprovals?: number;
}

const NAV: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badgeKey?: keyof NavCounts;
}[] = [
  { href: "/today", label: "Today", icon: Radar },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/pipeline", label: "Pipeline", icon: ListChecks },
  { href: "/candidates", label: "Candidates", icon: Users },
  { href: "/interviews", label: "Interviews", icon: CalendarDays },
  { href: "/decisions", label: "Decisions", icon: Sparkles },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesColumn },
  { href: "/activity", label: "Activity", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function PrimaryNav({
  counts,
  organizationName,
}: {
  counts: NavCounts;
  organizationName: string;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-2 px-3 pt-4">
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-card bg-pal-subtle text-base"
        >
          🧭
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-tight">RecruiterPal</p>
          <p className="truncate text-[11px] leading-tight text-text-secondary">
            {organizationName}
          </p>
        </div>
      </div>

      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2">
        {NAV.map(({ href, label, icon: Icon, badgeKey }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const badge = badgeKey ? counts[badgeKey] : undefined;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group flex h-8 items-center gap-2.5 rounded-control px-2.5 text-[13px] transition-colors duration-150 ${
                  active
                    ? "bg-surface-3 font-medium text-text-primary"
                    : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{label}</span>
                {badge && badge > 0 ? (
                  <span className="ml-auto inline-flex min-w-5 justify-center rounded-full bg-danger-subtle px-1.5 text-[11px] font-semibold tabular text-danger">
                    {badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
