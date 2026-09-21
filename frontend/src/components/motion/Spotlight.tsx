import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState } from "react";

export function Spotlight() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 70, damping: 22, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 70, damping: 22, mass: 0.6 });
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) {
      return;
    }
    setEnabled(true);
    const onMove = (event: PointerEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [x, y]);

  if (!enabled) {
    return null;
  }

  return <motion.div className="spotlight" style={{ left: sx, top: sy }} aria-hidden="true" />;
}
