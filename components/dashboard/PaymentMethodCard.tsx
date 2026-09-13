type PaymentMethodCardProps = {
  count: number;
  method: string;
  percentage: number;
  total: string;
};

export function PaymentMethodCard({
  count,
  method,
  percentage,
  total,
}: PaymentMethodCardProps) {
  return (
    <article className="border border-[var(--wk-line)] bg-white p-4 transition-shadow duration-200 hover:shadow-[0_10px_22px_rgb(16_23_42_/_0.07)]">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-xs font-bold uppercase tracking-[0.07em] text-[var(--wk-muted)]">
          {method}
        </p>
        <span className="shrink-0 rounded-md bg-[var(--wk-canvas)] px-1.5 py-0.5 text-xs font-bold tabular-nums text-[var(--wk-muted)]">
          {count}
        </span>
      </div>
      <p className="mt-4 text-xl font-black tabular-nums text-[var(--wk-ink)]">
        {total}
      </p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--wk-canvas)]">
        <div
          className="h-full rounded-full bg-[var(--wk-brand)]"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-2 text-xs font-semibold tabular-nums text-[var(--wk-muted)]">
        {percentage.toFixed(1)}% of net sales
      </p>
    </article>
  );
}
