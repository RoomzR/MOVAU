import type { ReactNode } from "react";

type Width = "page" | "narrow" | "article";

type Props = {
  children: ReactNode;
  className?: string;
  width?: Width;
};

const widths: Record<Width, string> = {
  page: "max-w-[1600px]",
  narrow: "max-w-lg",
  article: "max-w-3xl",
};

/** Внутренняя рельса: контент выровнен, фон секции — на всю ширину экрана. */
export function Container({ children, className = "", width = "page" }: Props) {
  return (
    <div className={`mx-auto w-full ${widths[width]} px-6 md:px-10 lg:px-16 ${className}`}>
      {children}
    </div>
  );
}
