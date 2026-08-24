import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const session = await getSession(getAuth());
  if (session) redirect("/today");

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2.5">
            <span
              aria-hidden
              className="grid size-9 place-items-center rounded-card bg-pal-subtle text-lg"
            >
              🧭
            </span>
            <h1 className="text-xl font-semibold tracking-tight">RecruiterPal</h1>
          </div>
          <p className="text-[14px] leading-relaxed text-text-secondary">
            The agent-driven workspace for evidence-based recruiting. Sign in to
            your recruiting portfolio.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
