import { RefreshCw, Wifi } from "lucide-react";
import { WokkangMark } from "./WokkangMark";

type ConnectionStatus = "checking" | "connected" | "disconnected";

type AppHeaderProps = {
  autoRefresh: boolean;
  connectionStatus: ConnectionStatus;
  isLoading: boolean;
  lastUpdated: string;
  onRefresh: () => void;
  onToggleAutoRefresh: () => void;
};

const navigationItems = ["Dashboard", "Transactions", "Products", "Settings"];

export function AppHeader({
  autoRefresh,
  connectionStatus,
  isLoading,
  lastUpdated,
  onRefresh,
  onToggleAutoRefresh,
}: AppHeaderProps) {
  const connectionLabel =
    connectionStatus === "connected"
      ? "StoreHub connected"
      : connectionStatus === "disconnected"
        ? "StoreHub disconnected"
        : "Checking StoreHub connection";

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--wk-line)] bg-[color:rgb(255_255_255_/_0.9)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <WokkangMark />
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
        </div>
      </div>
    </header>
  );
}
