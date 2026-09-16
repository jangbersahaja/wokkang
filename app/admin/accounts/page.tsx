import { AppHeader } from "@/components/dashboard/AppHeader";
import { requireRole } from "@/lib/auth/dal";
import { listRegistrationTokens, listUsers } from "@/lib/auth/users";
import AccountsManagementClient from "./AccountsManagementClient";

export default async function AccountsManagementPage() {
  const session = await requireRole(["SUPER_ADMIN", "ADMIN"]);
  const [users, tokens] = await Promise.all([
    listUsers(),
    listRegistrationTokens(),
  ]);

  const unusedTokens = tokens.filter((t) => !t.used_at);

  return (
    <div className="min-h-screen w-full bg-[var(--wk-canvas)]">
      <AppHeader username={session.username} canManageAccounts />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-black text-[var(--wk-ink)]">
            Account Manager
          </h1>
          <p className="text-[var(--wk-muted)]">
            Invite new team members and manage existing accounts.
          </p>
        </div>

        <AccountsManagementClient
          users={users}
          unusedTokens={unusedTokens}
          currentUserId={session.userId}
          currentUserRole={session.role}
        />
      </div>
    </div>
  );
}
