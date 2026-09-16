"use client";

import { logout } from "@/app/actions/auth";
import { Menu, RefreshCw, Wifi, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { WokkangMark } from "./WokkangMark";

type ConnectionStatus = "checking" | "connected" | "disconnected";

type AppHeaderProps = {
  // Dashboard-only live-refresh controls — omit these props on pages that
  // don't poll StoreHub data and the controls simply won't render.
  autoRefresh?: boolean;
  connectionStatus?: ConnectionStatus;
  isLoading?: boolean;
  lastUpdated?: string;
  onRefresh?: () => void;
  onToggleAutoRefresh?: () => void;
  username?: string;
  canManageAccounts?: boolean;
};

const navigationItems = ["Dashboard", "Transactions", "Products", "Settings"];

export function AppHeader({
  autoRefresh,
  connectionStatus,
  isLoading,
  lastUpdated,
  onRefresh,
  onToggleAutoRefresh,
  username,
  canManageAccounts,
}: AppHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const showRefreshControls = Boolean(onRefresh && onToggleAutoRefresh);

  const connectionLabel =
    connectionStatus === "connected"
      ? "StoreHub connected"
      : connectionStatus === "disconnected"
        ? "StoreHub disconnected"
        : "Checking StoreHub connection";

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--wk-line)] bg-[color:rgb(255_255_255_/_0.9)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/">
          <WokkangMark />
        </Link>
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Primary navigation"
        >
          {navigationItems.map((item) => (
            <button
              key={item}
              type="button"
              disabled={item !== "Dashboard"}
              title={
                item === "Dashboard"
                  ? "Current dashboard"
                  : `${item} coming soon`
              }
              className={
                item === "Dashboard"
                  ? "rounded-md bg-[var(--wk-ink)] px-3 py-1.5 text-sm font-semibold text-white"
                  : "rounded-md px-3 py-1.5 text-sm font-semibold text-[var(--wk-muted)] disabled:cursor-not-allowed disabled:opacity-55"
              }
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {showRefreshControls && (
            <>
              <div className="hidden items-center gap-2 text-xs font-medium text-[var(--wk-muted)] sm:flex">
                <span
                  className={`h-2 w-2 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-[var(--wk-success)]"
                      : connectionStatus === "disconnected"
                        ? "bg-[var(--wk-danger)]"
                        : "animate-pulse bg-[var(--wk-warning)]"
                  }`}
                  aria-hidden="true"
                />
                <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{connectionLabel}</span>
                {lastUpdated && (
                  <span className="text-[var(--wk-faint)]">{lastUpdated}</span>
                )}
              </div>
              <button
                type="button"
                onClick={onToggleAutoRefresh}
                aria-pressed={autoRefresh}
                className={`rounded-md border px-2.5 py-1.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wk-brand)] ${
                  autoRefresh
                    ? "border-[var(--wk-brand)] bg-[var(--wk-brand)] text-white"
                    : "border-[var(--wk-line-strong)] bg-white text-[var(--wk-muted)] hover:border-[var(--wk-ink)]"
                }`}
              >
                Auto {autoRefresh ? "on" : "off"}
              </button>
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                title="Refresh dashboard"
                aria-label="Refresh dashboard"
                className="grid h-8 w-8 place-items-center rounded-md bg-[var(--wk-ink)] text-white transition-colors hover:bg-[var(--wk-brand)] disabled:cursor-wait disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wk-brand)]"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
              </button>
            </>
          )}
          {username && (
            <div className="hidden items-center gap-2 border-l border-[var(--wk-line)] pl-2 sm:flex">
              {canManageAccounts && (
                <Link
                  href="/admin/accounts"
                  className="rounded-md px-2.5 py-1.5 text-xs font-bold text-[var(--wk-muted)] hover:text-[var(--wk-ink)]"
                >
                  Accounts
                </Link>
              )}
              <span className="text-xs font-medium text-[var(--wk-muted)]">
                {username}
              </span>
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-md px-2.5 py-1.5 text-xs font-bold text-[var(--wk-muted)] hover:text-[var(--wk-danger)]"
                >
                  Logout
                </button>
              </form>
            </div>
          )}
          {username && (
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-account-menu"
              aria-label="Open account menu"
              className="grid h-8 w-8 place-items-center rounded-md border border-[var(--wk-line-strong)] text-[var(--wk-ink)] sm:hidden"
            >
              {isMobileMenuOpen ? (
                <X className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Menu className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>
      {username && isMobileMenuOpen && (
        <div
          id="mobile-account-menu"
          className="border-t border-[var(--wk-line)] bg-white px-4 py-3 sm:hidden"
        >
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <span className="mr-auto text-sm font-medium text-[var(--wk-muted)]">
              {username}
            </span>
            {canManageAccounts && (
              <Link
                href="/admin/accounts"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-md bg-[var(--wk-ink)] px-3 py-1.5 text-xs font-bold text-white"
              >
                Accounts
              </Link>
            )}
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md px-3 py-1.5 text-xs font-bold text-[var(--wk-danger)]"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
