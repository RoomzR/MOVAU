import type { ReactNode } from "react";

import { Container } from "./Container";

type Width = "page" | "narrow" | "article";

type Props = {
  children: ReactNode;
  className?: string;
  width?: Width;
  narrow?: boolean;
};

export function Page({ children, className = "", width, narrow = false }: Props) {
  const size = width ?? (narrow ? "narrow" : "page");
  return (
    <Container width={size} className={className}>
      {children}
    </Container>
  );
}
