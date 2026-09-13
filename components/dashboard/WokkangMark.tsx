type WokkangMarkProps = {
  compact?: boolean;
};

export function WokkangMark({ compact = false }: WokkangMarkProps) {
  return (
    <div className="flex items-center gap-2.5" aria-label="Wokkang">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center bg-[var(--wk-ink)] text-sm font-black text-white shadow-[3px_3px_0_var(--wk-cyan)]"
        aria-hidden="true"
      >
        W
      </span>
      {!compact && (
        <span className="text-base font-black tracking-[0.02em] text-[var(--wk-ink)]">
          Wokkang
        </span>
      )}
    </div>
  );
}
