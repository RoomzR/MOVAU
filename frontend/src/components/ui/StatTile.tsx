import type { ReactNode } from "react";

type Props = {
  label: string;
  children: ReactNode;
  className?: string;
};

export function StatTile({ label, children, className = "" }: Props) {
  return (
    <div className={`border-b border-border p-6 sm:border-r ${className}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <dd className="mt-3 font-display text-2xl leading-snug">{children}</dd>
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <dl className="mt-10 grid border-t border-border sm:grid-cols-2">{children}</dl>;
}
