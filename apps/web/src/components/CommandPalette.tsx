"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command, Search } from "lucide-react";
import { requestPalPrompt } from "@/components/pal-events";

type CommandItem = {
  label: string;
  detail: string;
  href: string;
  prompt?: string;
};

const COMMANDS: readonly CommandItem[] = [
  { label: "Open Today", detail: "Execution surface", href: "/today" },
  { label: "Open pipeline", detail: "Inspect stage flow", href: "/pipeline" },
  {
    label: "Review decision readiness",
    detail: "Human review queue",
    href: "/today?intent=readiness-review",
  },
  {
    label: "Chase overdue scorecards",
    detail: "Safe reminder workflow",
    href: "/today?intent=scorecard-chase",
  },
  {
    label: "Resolve scheduling",
    detail: "Find safe interview options",
    href: "/today?intent=scheduling-resolution",
  },
  { label: "Open candidate workspace", detail: "Evidence and scorecards", href: "/candidates" },
  { label: "View execution timeline", detail: "Append-only audit ledger", href: "/activity" },
];

export function CommandPalette() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const filtered = useMemo<CommandItem[]>(() => {
    const matching = COMMANDS.filter((command) =>
      `${command.label} ${command.detail}`.toLowerCase().includes(query.toLowerCase()),
    );
    const trimmed = query.trim();
    return trimmed
      ? [
          {
            label: `Ask RecruiterPal: ${trimmed}`,
            detail: "Open contextual agent",
            href: "/today",
            prompt: trimmed,
          },
          ...matching,
        ]
      : matching;
  }, [query]);
  const openPalette = useCallback(() => {
    setQuery("");
    setSelected(0);
    setOpen(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openPalette();
      }
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openPalette]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const close = () => setOpen(false);
  const run = (command: CommandItem) => {
    close();
    if (command.prompt) {
      if (window.location.pathname === "/today") {
        requestPalPrompt({ prompt: command.prompt });
      } else {
        router.push(`/today?pal=${encodeURIComponent(command.prompt)}`);
      }
      return;
    }
    router.push(command.href);
  };

  return (
    <>
      <button
        type="button"
        data-command-palette-trigger
        onClick={openPalette}
        className="fixed bottom-4 right-4 z-30 inline-flex h-9 items-center gap-2 rounded-control border border-border-strong bg-surface-1 px-3 text-[12px] font-medium text-text-secondary shadow-popover transition-colors hover:bg-surface-2 hover:text-text-primary"
        aria-label="Open command palette"
      >
        <Command className="size-3.5" aria-hidden />
        <span className="hidden sm:inline">Command palette</span>
        <kbd className="rounded border border-border-subtle bg-surface-2 px-1.5 py-0.5 text-[10px]">
          ⌘K
        </kbd>
      </button>

      <AnimatePresence>
        {open ? (
          <div
            className="fixed inset-0 z-40 flex items-start justify-center bg-black/20 px-4 pt-[12vh]"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Command palette"
              initial={{ opacity: 0, y: reducedMotion ? 0 : -8, scale: reducedMotion ? 1 : 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: reducedMotion ? 0 : -4 }}
              transition={{ duration: reducedMotion ? 0 : 0.16 }}
              className="w-full max-w-xl overflow-hidden rounded-overlay border border-border-strong bg-surface-1 shadow-drawer"
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setSelected((current) =>
                    filtered.length === 0 ? 0 : (current + 1) % filtered.length,
                  );
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setSelected((current) =>
                    filtered.length === 0 ? 0 : (current - 1 + filtered.length) % filtered.length,
                  );
                }
                if (event.key === "Enter" && filtered[selected]) run(filtered[selected]);
              }}
            >
              <div className="flex items-center gap-2 border-b border-border-subtle px-4">
                <Search className="size-4 text-text-tertiary" aria-hidden />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSelected(0);
                  }}
                  placeholder="Navigate or ask RecruiterPal to prepare a safe action…"
                  className="h-12 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-text-tertiary"
                  aria-label="Search commands"
                />
                <kbd className="rounded border border-border-subtle px-1.5 py-0.5 text-[10px] text-text-tertiary">
                  Esc
                </kbd>
              </div>
              <div className="p-2">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
                  Commands
                </p>
                {filtered.length === 0 ? (
                  <p className="px-2 py-5 text-[13px] text-text-secondary">No matching command.</p>
                ) : (
                  <ul role="listbox" aria-label="Commands" className="space-y-0.5">
                    {filtered.map((command, index) => (
                      <li
                        key={`${command.href}-${command.prompt ?? command.label}`}
                        role="option"
                        aria-selected={index === selected}
                      >
                        <button
                          type="button"
                          onMouseEnter={() => setSelected(index)}
                          onClick={() => run(command)}
                          className={`flex w-full items-center justify-between gap-4 rounded-control px-3 py-2 text-left ${index === selected ? "bg-pal-subtle" : "hover:bg-surface-2"}`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-medium">
                              {command.label}
                            </span>
                            <span className="block truncate text-[11px] text-text-secondary">
                              {command.detail}
                            </span>
                          </span>
                          <span className="shrink-0 text-[11px] text-pal-text">↵</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
