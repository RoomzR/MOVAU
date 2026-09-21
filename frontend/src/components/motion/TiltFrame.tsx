import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useRef, type PointerEvent, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export function TiltFrame({ children, className = "" }: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rx = useSpring(useTransform(y, [-0.5, 0.5], [10, -10]), { stiffness: 160, damping: 18 });
  const ry = useSpring(useTransform(x, [-0.5, 0.5], [-12, 12]), { stiffness: 160, damping: 18 });

  function onMove(event: PointerEvent<HTMLDivElement>) {
    const box = ref.current?.getBoundingClientRect();
    if (!box) {
      return;
    }
    x.set((event.clientX - box.left) / box.width - 0.5);
    y.set((event.clientY - box.top) / box.height - 0.5);
  }

  function onLeave() {
    x.set(0);
    y.set(0);
  }

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={`[transform-style:preserve-3d] ${className}`}
      style={{ rotateX: rx, rotateY: ry }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {children}
    </motion.div>
  );
}
