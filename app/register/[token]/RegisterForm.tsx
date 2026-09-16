"use client";

import { registerWithToken, type RegisterState } from "@/app/actions/auth";
import { useActionState } from "react";

export default function RegisterForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(
    registerWithToken,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      <div>
        <label
          htmlFor="username"
          className="mb-2 block text-sm font-medium text-[var(--wk-ink)]"
        >
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          placeholder="Choose a username"
          className="w-full rounded-lg border border-[var(--wk-line-strong)] px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--wk-brand)]"
          disabled={pending}
          required
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium text-[var(--wk-ink)]"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          className="w-full rounded-lg border border-[var(--wk-line-strong)] px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--wk-brand)]"
          disabled={pending}
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
          placeholder="At least 8 characters"
          className="w-full rounded-lg border border-[var(--wk-line-strong)] px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--wk-brand)]"
          disabled={pending}
          required
        />
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-2 block text-sm font-medium text-[var(--wk-ink)]"
        >
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Re-enter your password"
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
        {pending ? "Creating account..." : "Create Account"}
      </button>
    </form>
  );
}
