import { motion, useReducedMotion } from "motion/react";

type Props = {
  text: string;
  className?: string;
  delay?: number;
};

export function KineticTitle({ text, className = "", delay = 0 }: Props) {
  const reduce = useReducedMotion();

  return (
    <span className={`block overflow-hidden pb-[0.12em] [perspective:800px] ${className}`}>
      <motion.span
        className="block origin-bottom will-change-transform"
        initial={reduce ? false : { y: "108%", rotateX: 55 }}
        animate={{ y: "0%", rotateX: 0 }}
        transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        {text}
      </motion.span>
    </span>
  );
}
