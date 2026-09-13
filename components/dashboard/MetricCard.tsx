import type { ReactNode } from "react";

type MetricCardProps = {
  detail?: string;
  icon: ReactNode;
  label: string;
  tone?: "default" | "success" | "warning";
  value: string;
};

const toneStyles = {
  default: "bg-white text-[var(--wk-ink)]",
  success: "bg-[var(--wk-success-soft)] text-[var(--wk-success)]",
  warning: "bg-[var(--wk-warning-soft)] text-[var(--wk-warning)]",
};

export function MetricCard({
  detail,
  icon,
  label,
  tone = "default",
  value,
}: MetricCardProps) {
  return (
    <article className="group min-h-36 border border-[var(--wk-line)] bg-white p-4 shadow-[0_1px_0_rgb(16_23_42_/_0.02)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgb(16_23_42_/_0.08)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--wk-muted)]">
          {label}
        </p>
        <span
          className={`grid h-8 w-8 place-items-center rounded-md ${toneStyles[tone]}`}
        >
          {icon}
        </span>
      </div>
      <p
        className={`mt-5 text-2xl font-black tracking-[0.01em] tabular-nums ${tone === "default" ? "text-[var(--wk-ink)]" : toneStyles[tone].split(" ")[1]}`}
      >
        {value}
      </p>
      {detail && (
        <p className="mt-1 text-xs font-medium text-[var(--wk-muted)]">
          {detail}
        </p>
      )}
    </article>
  );
}
