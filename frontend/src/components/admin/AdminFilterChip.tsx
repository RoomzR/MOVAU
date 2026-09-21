type Props = {
  label: string;
  active: boolean;
  onClick: () => void;
};

export function AdminFilterChip({ label, active, onClick }: Props) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-11 cursor-pointer items-center border px-3 text-[11px] font-semibold uppercase tracking-[0.14em] ${
        active ? "border-primary bg-primary text-on-primary" : "border-border text-foreground hover:border-primary hover:text-primary"
      }`}
    >
      {label}
    </button>
  );
}
