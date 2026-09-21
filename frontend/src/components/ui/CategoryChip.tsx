import {
  Baby,
  Car,
  HandHelping,
  Home,
  MoreHorizontal,
  PawPrint,
  Pill,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

import { CATEGORIES, categoryLabel, statusLabel } from "../../lib/labels";

const ICONS: Record<string, LucideIcon> = {
  errand: HandHelping,
  pharmacy: Pill,
  grocery: ShoppingBag,
  ride: Car,
  home: Home,
  animals: PawPrint,
  kids: Baby,
  other: MoreHorizontal,
};

type Props = {
  value: string;
  selected?: boolean;
  onSelect?: (value: string) => void;
};

export function CategoryChip({ value, selected, onSelect }: Props) {
  const Icon = ICONS[value] ?? MoreHorizontal;
  const label = categoryLabel(value);
  const filled = selected ?? !onSelect;
  const className = `inline-flex min-h-11 shrink-0 items-center gap-1.5 border px-3 text-[11px] font-semibold uppercase tracking-[0.14em] ${
    filled
      ? "border-primary bg-primary text-on-primary"
      : "border-border bg-background/90 text-foreground hover:border-primary hover:text-primary"
  }`;

  if (onSelect) {
    return (
      <button type="button" className={`cursor-pointer ${className}`} onClick={() => onSelect(value)}>
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {label}
      </button>
    );
  }

  return (
    <span className={className}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}

export function StatusChip({ value }: { value: string }) {
  return (
    <span className="inline-flex min-h-11 items-center border border-border px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {statusLabel(value)}
    </span>
  );
}

export function CategoryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Категория</legend>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((row) => (
          <CategoryChip
            key={row.id}
            value={row.id}
            selected={value === row.id}
            onSelect={onChange}
          />
        ))}
      </div>
    </fieldset>
  );
}
