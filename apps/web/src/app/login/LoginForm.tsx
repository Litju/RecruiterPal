"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DEMO_ACCOUNTS = [
  { label: "Recruiting Lead", email: "jordan.reyes@northstar-labs.example" },
  { label: "Recruiter", email: "casey.lin@northstar-labs.example" },
];

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(withEmail: string, withPassword: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: withEmail, password: withPassword }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? "Sign in failed. Check your credentials.");
        return;
      }
      router.push("/today");
      router.refresh();
    } catch {
      setError("Network error. Is the server running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-5">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void signIn(email, password);
        }}
      >
        <div>
          <label htmlFor="email" className="mb-1 block text-[13px] font-medium text-text-primary">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 w-full rounded-control border border-border-subtle bg-surface-1 px-3 text-[14px] text-text-primary placeholder:text-text-tertiary"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-[13px] font-medium text-text-primary"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 w-full rounded-control border border-border-subtle bg-surface-1 px-3 text-[14px] text-text-primary placeholder:text-text-tertiary"
            placeholder="••••••••"
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-control bg-danger-subtle px-3 py-2 text-[13px] text-danger"
          >
            <span aria-hidden>✕</span> {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="h-10 w-full rounded-control bg-pal-strong px-4 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-pal disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="rounded-card border border-border-subtle bg-surface-2 p-4">
        <p className="text-[12px] font-medium uppercase tracking-wide text-text-secondary">
          Demo accounts (seeded)
        </p>
        <ul className="mt-2 space-y-1.5">
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.email}>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setEmail(a.email);
                  setPassword("northstar-demo-2026");
                  void signIn(a.email, "northstar-demo-2026");
                }}
                className="text-[13px] text-info underline-offset-2 hover:underline disabled:opacity-60"
              >
                Sign in as {a.label} — {a.email}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] leading-relaxed text-text-tertiary">
          Synthetic Northstar Labs data only. Run <code>pnpm db:migrate && pnpm db:seed</code>{" "}
          first.
        </p>
      </div>
    </div>
  );
}
