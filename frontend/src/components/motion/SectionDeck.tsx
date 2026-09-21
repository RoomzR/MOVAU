import { motion } from "motion/react";
import {
  Children,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { HOME_TOP_EVENT } from "../../lib/homeDeck";

type Props = {
  children: ReactNode;
};

export function SectionDeck({ children }: Props) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [height, setHeight] = useState(() =>
    typeof window === "undefined" ? 800 : Math.max(window.innerHeight - 72, 400),
  );
  const indexRef = useRef(0);
  const locked = useRef(false);
  const touchY = useRef<number | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  indexRef.current = index;

  const goBy = useCallback(
    (delta: number) => {
      if (locked.current || delta === 0) {
        return;
      }
      const next = Math.max(0, Math.min(count - 1, indexRef.current + delta));
      if (next === indexRef.current) {
        return;
      }
      setDirection(delta > 0 ? 1 : -1);
      locked.current = true;
      setIndex(next);
    },
    [count],
  );

  const goTo = useCallback(
    (next: number) => {
      const target = Math.max(0, Math.min(count - 1, next));
      if (target === indexRef.current) {
        return;
      }
      setDirection(target > indexRef.current ? 1 : -1);
      locked.current = true;
      setIndex(target);
    },
    [count],
  );

  useEffect(() => {
    const onHomeTop = () => goTo(0);
    window.addEventListener(HOME_TOP_EVENT, onHomeTop);
    return () => window.removeEventListener(HOME_TOP_EVENT, onHomeTop);
  }, [goTo]);

  useLayoutEffect(() => {
    const node = viewportRef.current;
    if (!node) {
      return;
    }
    const apply = () => setHeight(Math.max(node.clientHeight, 1));
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      locked.current = false;
    }, 820);
    return () => window.clearTimeout(id);
  }, [index]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    const isLocal = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest("[data-local-scroll]"));

    const onWheel = (event: WheelEvent) => {
      if (isLocal(event.target)) {
        return;
      }
      event.preventDefault();
      if (Math.abs(event.deltaY) < 6) {
        return;
      }
      goBy(event.deltaY > 0 ? 1 : -1);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (isLocal(event.target)) {
        touchY.current = null;
        return;
      }
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
      if (Math.abs(dy) < 40) {
        return;
      }
      goBy(dy > 0 ? 1 : -1);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (target?.closest("[data-local-scroll]")) {
        return;
      }
      if (["ArrowDown", "PageDown", " ", "Spacebar"].includes(event.key)) {
        event.preventDefault();
        goBy(1);
      }
      if (["ArrowUp", "PageUp"].includes(event.key)) {
        event.preventDefault();
        goBy(-1);
      }
      if (event.key === "Home") {
        event.preventDefault();
        goTo(0);
      }
      if (event.key === "End") {
        event.preventDefault();
        goTo(count - 1);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKey);

    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKey);
    };
  }, [count, goBy, goTo]);

  return (
    <div ref={viewportRef} className="section-deck relative">
      {slides.map((slide, slideIndex) => (
        <motion.div
          key={slideIndex}
          className="section-slide"
          initial={false}
          animate={{ y: slideIndex <= index ? 0 : height }}
          transition={{ duration: 0.78, ease: [0.77, 0, 0.175, 1] }}
          style={{ zIndex: slideIndex + 1, pointerEvents: slideIndex === index ? "auto" : "none" }}
          aria-hidden={slideIndex !== index}
        >
          {slideIndex > 0 ? <div className="section-edge" aria-hidden="true" /> : null}
          {slide}
        </motion.div>
      ))}
      <motion.div
        key={`volt-${index}`}
        className="section-volt"
        initial={{ top: direction > 0 ? height : 0, opacity: 1 }}
        animate={{ top: direction > 0 ? 0 : height, opacity: [1, 1, 0] }}
        transition={{ duration: 0.78, ease: [0.77, 0, 0.175, 1] }}
        aria-hidden="true"
      />
      <nav
        className="pointer-events-auto absolute right-3 top-1/2 z-40 -translate-y-1/2 md:right-5"
        aria-label="Секции"
      >
        <ul className="flex flex-col">
          {slides.map((_, slideIndex) => (
            <li key={slideIndex}>
              <button
                type="button"
                className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center"
                aria-label={`Секция ${slideIndex + 1}`}
                aria-current={slideIndex === index ? "true" : undefined}
                onClick={() => goTo(slideIndex)}
              >
                <span
                  className={`block h-2.5 w-2.5 border-2 ${
                    slideIndex === index ? "border-primary bg-primary" : "border-zinc-500 bg-transparent"
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
