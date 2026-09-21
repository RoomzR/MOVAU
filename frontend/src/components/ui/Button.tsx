import { motion, useReducedMotion } from "motion/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"
> & {
  children: ReactNode;
  variant?: "primary" | "accent" | "ghost" | "invert" | "ink";
  size?: "md" | "lg";
};

const variants = {
  primary: "flood",
  accent: "bg-primary text-on-primary hover:bg-secondary hover:text-foreground",
  ghost: "border border-zinc-700 text-foreground hover:border-primary hover:text-primary",
  invert:
    "border-2 border-on-primary bg-on-primary text-primary hover:bg-transparent hover:text-on-primary",
  ink: "border-2 border-on-primary bg-transparent text-on-primary hover:bg-on-primary hover:text-primary",
};

const sizes = {
  md: "min-h-11 px-5 text-xs",
  lg: "min-h-14 px-8 text-sm",
};

export function Button({ children, variant = "primary", size = "md", className = "", ...props }: Props) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      whileTap={reduce ? undefined : { scale: 0.98 }}
      className={`inline-flex cursor-pointer items-center justify-center text-center font-semibold uppercase leading-tight tracking-[0.12em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60 ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
