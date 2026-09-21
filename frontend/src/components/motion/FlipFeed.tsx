import { ChevronDown, ChevronUp } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

type Item = {
  category: string;
  title: string;
  meta: string;
};

type Props = {
  items: Item[];
  interval?: number;
  className?: string;
  framed?: boolean;
  showChrome?: boolean;
  showCurrent?: boolean;
  index?: number;
  onIndexChange?: (index: number) => void;
};

function Card({ item }: { item: Item }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[10px] tracking-[0.14em] text-muted-foreground">{item.category}</p>
        <p className="mt-1 truncate text-sm leading-tight">{item.title}</p>
      </div>
      <p className="shrink-0 text-xs text-muted-foreground">{item.meta}</p>
    </div>
  );
}

export function FlipFeed({
  items,
  interval = 4000,
  className = "",
  framed = true,
  showChrome = true,
  showCurrent = true,
  index: controlledIndex,
  onIndexChange,
}: Props) {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const touchY = useRef<number | null>(null);
  const locked = useRef(false);
  const [internal, setInternal] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  const count = items.length;
  const index = controlledIndex ?? internal;
  const indexRef = useRef(index);
  indexRef.current = index;

  const go = useCallback(
    (delta: number) => {
      if (count < 2 || locked.current || delta === 0) {
        return;
      }
      locked.current = true;
      setDir(delta > 0 ? 1 : -1);
      const next = (indexRef.current + delta + count) % count;
      if (controlledIndex === undefined) {
        setInternal(next);
      }
      onIndexChange?.(next);
      window.setTimeout(() => {
        locked.current = false;
      }, 420);
    },
    [controlledIndex, count, onIndexChange],
  );

  useEffect(() => {
    if (paused || reduce === true || count < 2) {
      return;
    }
    const id = window.setInterval(() => go(1), interval);
    return () => window.clearInterval(id);
  }, [count, go, interval, paused, reduce]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (Math.abs(event.deltaY) < 8 && Math.abs(event.deltaX) < 8) {
        return;
      }
      go(event.deltaY + event.deltaX > 0 ? 1 : -1);
    };

    const onTouchStart = (event: TouchEvent) => {
      touchY.current = event.touches[0]?.clientY ?? null;
    };

    const onTouchEnd = (event: TouchEvent) => {
      const start = touchY.current;
      touchY.current = null;
      if (start == null) {
        return;
      }
      const end = event.changedTouches[0]?.clientY;
      if (end == null) {
        return;
      }
      const dy = start - end;
      if (Math.abs(dy) < 28) {
        return;
      }
      event.preventDefault();
      go(dy > 0 ? 1 : -1);
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchend", onTouchEnd, { passive: false });
    return () => {
      node.removeEventListener("wheel", onWheel);
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchend", onTouchEnd);
    };
  }, [go]);

  const next = items[(index + 1) % count];
  const after = items[(index + 2) % count];
  const label = `${String(index + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`;

  return (
    <div
      ref={rootRef}
      data-local-scroll="true"
      tabIndex={0}
      className={`cursor-ns-resize overflow-hidden bg-card outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        framed ? "border-2 border-primary" : ""
      } ${className}`}
      aria-label="Заявки рядом. Листайте колесом или свайпом."
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "PageDown") {
          event.preventDefault();
          event.stopPropagation();
          go(1);
        }
        if (event.key === "ArrowUp" || event.key === "PageUp") {
          event.preventDefault();
          event.stopPropagation();
          go(-1);
        }
      }}
    >
      {showChrome ? (
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
          <p className="text-[11px] tracking-[0.14em] text-muted-foreground">Сейчас рядом</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center text-muted-foreground hover:text-primary"
              aria-label="Предыдущая заявка"
              onClick={() => go(-1)}
            >
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="min-w-14 text-center font-display text-[11px] tracking-[0.14em] text-primary">{label}</p>
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center text-muted-foreground hover:text-primary"
              aria-label="Следующая заявка"
              onClick={() => go(1)}
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
      {showCurrent ? (
      <div className="relative overflow-hidden border-b border-border [perspective:900px]">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={items[index].title}
            custom={dir}
            initial={reduce === true ? false : { rotateX: dir * -70, y: dir * 16, opacity: 0 }}
            animate={{ rotateX: 0, y: 0, opacity: 1 }}
            exit={reduce === true ? undefined : { rotateX: dir * 70, y: dir * -16, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="origin-top will-change-transform"
          >
          <Card item={items[index]} />
          </motion.div>
        </AnimatePresence>
      </div>
      ) : null}
      <button
        type="button"
        className="w-full cursor-pointer border-b border-border text-left opacity-70 hover:bg-muted hover:opacity-100"
        onClick={() => go(1)}
      >
        <Card item={next} />
      </button>
      <button
        type="button"
        className="w-full cursor-pointer text-left opacity-45 hover:bg-muted hover:opacity-100"
        onClick={() => go(2)}
      >
        <Card item={after} />
      </button>
    </div>
  );
}
