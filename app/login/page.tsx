"use client";

import { login, type LoginState } from "@/app/actions/auth";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";
import { WokkangMark } from "../../components/dashboard/WokkangMark";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("from") || "";
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    undefined,
  );

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[var(--wk-canvas)] p-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-[var(--wk-line)] bg-[var(--wk-surface)] p-8 shadow-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <WokkangMark />
            <p className="text-sm text-[var(--wk-muted)]">
              Sign in to your dashboard
            </p>
          </div>

          <form action={formAction} className="space-y-6">
            <input type="hidden" name="redirectTo" value={redirectTo} />

            <div>
              <label
                htmlFor="identifier"
                className="mb-2 block text-sm font-medium text-[var(--wk-ink)]"
              >
                Username or Email
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                placeholder="Enter your username or email"
                className="w-full rounded-lg border border-[var(--wk-line-strong)] px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--wk-brand)]"
                disabled={pending}
                autoFocus
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-[var(--wk-ink)]"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                className="w-full rounded-lg border border-[var(--wk-line-strong)] px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--wk-brand)]"
                disabled={pending}
                required
              />
            </div>

            {state?.error && (
              <div className="rounded-lg border border-[var(--wk-danger)]/30 bg-[var(--wk-danger-soft)] p-3">
                <p className="text-sm font-medium text-[var(--wk-danger)]">
                  {state.error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-[var(--wk-ink)] py-3 font-semibold text-white transition-colors duration-200 hover:bg-[var(--wk-brand)] disabled:opacity-50"
            >
              {pending ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
