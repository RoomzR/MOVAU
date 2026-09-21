import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

type Props = {
  words: string[];
  className?: string;
  interval?: number;
};

export function FlipWord({ words, className = "", interval = 2400 }: Props) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const longest = words.reduce((a, b) => (a.length >= b.length ? a : b));

  useEffect(() => {
    if (reduce || words.length < 2) {
      return;
    }
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % words.length);
    }, interval);
    return () => window.clearInterval(id);
  }, [interval, reduce, words.length]);

  return (
    <span className={`relative block whitespace-nowrap ${className}`}>
      <span className="invisible block pb-[0.12em]" aria-hidden="true">
        {longest}
      </span>
      <span className="absolute inset-0 overflow-hidden [perspective:700px]">
        <AnimatePresence mode="wait">
          <motion.span
            key={words[index]}
            className="absolute inset-0 block origin-bottom will-change-transform"
            initial={reduce ? false : { y: "110%", rotateX: -80, opacity: 0 }}
            animate={{ y: "0%", rotateX: 0, opacity: 1 }}
            exit={reduce ? undefined : { y: "-110%", rotateX: 80, opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            {words[index]}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}
