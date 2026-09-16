"use client";

import {
  removeRegistrationLink,
  removeUser,
  type RemoveLinkState,
  type RemoveUserState,
} from "@/app/actions/auth";
import { ROLE_LABELS, invitableRolesFor, type Role } from "@/lib/auth/roles";
import type { RegistrationToken, User } from "@/lib/auth/users";
import { useActionState } from "react";
import GenerateLinkForm from "./GenerateLinkForm";

export default function AccountsManagementClient({
  users,
  unusedTokens,
  currentUserId,
  currentUserRole,
}: {
  users: User[];
  unusedTokens: RegistrationToken[];
  currentUserId: number;
  currentUserRole: Role;
}) {
  const removableRoles = invitableRolesFor(currentUserRole);
  const roleOrder: Role[] = ["SUPER_ADMIN", "ADMIN", "STAFF"];

  return (
    <div className="space-y-12">
      <section>
        <h2 className="mb-4 text-xl font-semibold text-[var(--wk-ink)]">
          Invite New User
        </h2>
        <GenerateLinkForm invitableRoles={removableRoles} />
      </section>

      {roleOrder.map((role) => {
        const roleUsers = users.filter((u) => u.role === role);
        const roleTokens = unusedTokens.filter((t) => t.role === role);
        const hasContent = roleUsers.length > 0 || roleTokens.length > 0;
        if (!hasContent) return null;

        return (
          <section key={role}>
            <div className="mb-6">
              <h2 className="mb-2 text-xl font-semibold text-[var(--wk-ink)]">
                {ROLE_LABELS[role]}
              </h2>
              <p className="text-sm text-[var(--wk-muted)]">
                {roleUsers.length} active account
                {roleUsers.length !== 1 ? "s" : ""} • {roleTokens.length}{" "}
                pending invitation{roleTokens.length !== 1 ? "s" : ""}
              </p>
            </div>

            {roleUsers.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 px-4 text-sm font-semibold text-[var(--wk-ink)]">
                  Active Accounts
                </h3>
                <div className="divide-y rounded-lg border border-[var(--wk-line)]">
                  {roleUsers.map((user) => (
                    <AccountRow
                      key={user.id}
                      user={user}
                      currentUserId={currentUserId}
                      canRemove={removableRoles.includes(user.role)}
                    />
                  ))}
                </div>
              </div>
            )}

            {roleTokens.length > 0 && (
              <div>
                <h3 className="mb-3 px-4 text-sm font-semibold text-[var(--wk-ink)]">
                  Pending Invitations
                </h3>
                <div className="divide-y rounded-lg border border-[var(--wk-line)] bg-[var(--wk-canvas)]">
                  {roleTokens.map((token) => (
                    <TokenRow key={token.id} token={token} />
                  ))}
                </div>
              </div>
            )}
          </section>
        );
      })}

      {users.length === 0 && unusedTokens.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-[var(--wk-muted)]">
            No accounts or pending invitations yet.
          </p>
        </div>
      )}
    </div>
  );
}

function AccountRow({
  user,
  currentUserId,
  canRemove,
}: {
  user: User;
  currentUserId: number;
  canRemove: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    RemoveUserState,
    FormData
  >(removeUser, undefined);

  const isSelf = user.id === currentUserId;
  if (state?.success) return null;

  return (
    <div className="flex items-center justify-between gap-4 p-4 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-[var(--wk-ink)]">{user.username}</p>
        <p className="text-xs text-[var(--wk-muted)]">{user.email}</p>
        {state?.error && (
          <p className="mt-1 text-xs font-medium text-[var(--wk-danger)]">
            {state.error}
          </p>
        )}
      </div>
      {canRemove && (
        <form action={formAction} className="shrink-0">
          <input type="hidden" name="id" value={user.id} />
          <button
            type="submit"
            disabled={pending || isSelf}
            title={isSelf ? "You cannot remove your own account" : undefined}
            className="rounded-lg bg-[var(--wk-danger-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--wk-danger)] transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Removing..." : "Remove"}
          </button>
        </form>
      )}
    </div>
  );
}

function TokenRow({ token }: { token: RegistrationToken }) {
  const [state, formAction, pending] = useActionState<
    RemoveLinkState,
    FormData
  >(removeRegistrationLink, undefined);

  if (state?.success) return null;

  return (
    <div className="flex items-center justify-between gap-4 p-4 text-sm">
      <div>
        <p className="font-medium text-[var(--wk-ink)]">Pending Invitation</p>
        <p className="break-all font-mono text-xs text-[var(--wk-muted)]">
          /register/{token.token}
        </p>
        {state?.error && (
          <p className="mt-1 text-xs font-medium text-[var(--wk-danger)]">
            {state.error}
          </p>
        )}
      </div>
      <form action={formAction} className="shrink-0">
        <input type="hidden" name="id" value={token.id} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--wk-danger-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--wk-danger)] transition-colors hover:opacity-80 disabled:opacity-40"
        >
          {pending ? "Removing..." : "Remove"}
        </button>
      </form>
    </div>
  );
}
