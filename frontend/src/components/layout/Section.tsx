import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Секция на высоту экрана (как экраны на крупных лендингах). */
  screen?: boolean;
};

export function Section({ children, className = "", screen = false }: Props) {
  return (
    <section
      className={`relative w-full ${screen ? "min-h-[calc(100svh-var(--header-h))]" : ""} ${className}`}
    >
      {children}
    </section>
  );
}
