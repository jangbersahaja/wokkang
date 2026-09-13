type StatusBadgeProps = {
  status: string;
};

const statusStyles = {
  cancelled: "bg-[var(--wk-danger-soft)] text-[var(--wk-danger)]",
  completed: "bg-[var(--wk-success-soft)] text-[var(--wk-success)]",
  pending: "bg-[var(--wk-warning-soft)] text-[var(--wk-warning)]",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  const style =
    statusStyles[normalizedStatus as keyof typeof statusStyles] ??
    statusStyles.pending;

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${style}`}
    >
      {status}
    </span>
  );
}
