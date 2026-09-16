"use client";

import {
  generateRegistrationLink,
  type GenerateLinkState,
} from "@/app/actions/auth";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { useActionState, useState } from "react";

export default function GenerateLinkForm({
  invitableRoles,
}: {
  invitableRoles: Role[];
}) {
  const [state, formAction, pending] = useActionState<
    GenerateLinkState,
    FormData
  >(generateRegistrationLink, undefined);
  const [copied, setCopied] = useState(false);

  const fullLink =
    state?.link && typeof window !== "undefined"
      ? `${window.location.origin}${state.link}`
      : state?.link;

  const handleCopy = async () => {
    if (!fullLink) return;
    try {
      await navigator.clipboard.writeText(fullLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (invitableRoles.length === 0) {
    return (
      <p className="rounded-lg border border-[var(--wk-line)] bg-[var(--wk-canvas)] p-4 text-sm text-[var(--wk-muted)]">
        You are not allowed to invite new accounts.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--wk-line)] bg-[var(--wk-canvas)] p-6">
      <form
        action={formAction}
        className="flex flex-col items-end gap-4 sm:flex-row"
      >
        <div className="w-full flex-1 sm:w-auto">
          <label
            htmlFor="role"
            className="mb-2 block text-sm font-medium text-[var(--wk-ink)]"
          >
            Role for new account
          </label>
          <select
            id="role"
            name="role"
            defaultValue={invitableRoles[invitableRoles.length - 1]}
            className="w-full rounded-lg border border-[var(--wk-line-strong)] bg-white px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--wk-brand)]"
            disabled={pending}
          >
            {invitableRoles.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full whitespace-nowrap rounded-lg bg-[var(--wk-ink)] px-6 py-3 font-semibold text-white transition-colors duration-200 hover:bg-[var(--wk-brand)] disabled:opacity-50 sm:w-auto"
        >
          {pending ? "Generating..." : "Generate Link"}
        </button>
      </form>

      {state?.error && (
        <p className="mt-4 text-sm font-medium text-[var(--wk-danger)]">
          {state.error}
        </p>
      )}

      {fullLink && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-[var(--wk-success)]/30 bg-[var(--wk-success-soft)] p-3">
          <div className="min-w-0">
            <p className="mb-1 text-sm font-medium text-[var(--wk-success)]">
              Registration link created:
            </p>
            <code className="break-all text-xs text-[var(--wk-ink)]">
              {fullLink}
            </code>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 whitespace-nowrap rounded-lg border border-[var(--wk-success)]/40 bg-white px-3 py-1.5 text-xs font-semibold text-[var(--wk-success)] transition-colors hover:opacity-80"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
