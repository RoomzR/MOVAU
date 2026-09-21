import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  label: string;
  className?: string;
};

export function ScrollPane({ children, label, className = "max-h-[min(50svh,24rem)]" }: Props) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={`scroll-volt overflow-y-auto overscroll-contain outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
    >
      {children}
    </div>
  );
}
