import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input({ label, id, className = "", ...props }: Props) {
  const inputId = id ?? props.name;
  return (
    <label className="block space-y-1.5" htmlFor={inputId}>
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <input
        id={inputId}
        className={`min-h-11 w-full rounded-none border-2 border-border bg-transparent px-3 text-base leading-normal text-foreground outline-none transition duration-150 placeholder:text-muted-foreground/70 focus:border-primary focus:ring-0 ${className}`}
        {...props}
      />
    </label>
  );
}
