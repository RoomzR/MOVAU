import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function AdminSearch({ label, id, className = "", ...props }: Props) {
  const inputId = id ?? props.name ?? "admin-search";
  return (
    <label className="block min-w-0 flex-1" htmlFor={inputId}>
      <span className="sr-only">{label}</span>
      <span className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          id={inputId}
          className={`min-h-11 w-full border-2 border-border bg-transparent py-2 pl-10 pr-3 text-base text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary ${className}`}
          aria-label={label}
          {...props}
        />
      </span>
    </label>
  );
}
