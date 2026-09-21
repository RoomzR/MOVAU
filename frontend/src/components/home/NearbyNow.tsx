import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";

import { HomeMinskMap } from "./HomeMinskMap";

export type NearbyItem = {
  category: string;
  title: string;
  meta: string;
};

type Props = {
  items: NearbyItem[];
  className?: string;
};

const PATHS = [
  { d: "M 28 318 L 200 318 L 200 200", duration: 11, delay: 0 },
  { d: "M 372 48 L 200 48 L 200 200", duration: 13, delay: 0.35 },
  { d: "M 48 52 L 48 200 L 200 200", duration: 15, delay: 0.8 },
];

export function NearbyNow({ items, className = "" }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;
  const item = items[index] ?? items[0];
  const label = `${String(index + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`;
  const queue = [0, 1, 2].map((offset) => items[(index + offset) % count]).filter(Boolean);

  function step(delta: number) {
    if (count < 2) {
      return;
    }
    setIndex((current) => (current + delta + count) % count);
  }

  useEffect(() => {
    if (paused || count < 2) {
      return;
    }
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, 4200);
    return () => window.clearInterval(id);
  }, [count, paused]);

  return (
    <div
      className={`relative flex h-full min-h-[320px] flex-col overflow-hidden border-2 border-primary bg-ink ${className}`}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <div className="relative min-h-[220px] flex-1">
        <NearbyRadar item={item} />
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 px-3 py-2">
          <p className="inline-flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            <span className="live-dot" />
            Сейчас рядом
          </p>
          <div className="flex items-center">
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center text-muted-foreground hover:text-primary"
              aria-label="Предыдущая заявка"
              onClick={() => step(-1)}
            >
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="min-w-12 text-center font-display text-[11px] tracking-[0.14em] text-muted-foreground">
              {label}
            </p>
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center text-muted-foreground hover:text-primary"
              aria-label="Следующая заявка"
              onClick={() => step(1)}
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-primary/35 bg-ink/90 backdrop-blur-sm" role="listbox" aria-label="Заявки рядом">
        {queue.map((entry, offset) => {
          const lit = offset === 0;
          const realIndex = (index + offset) % count;
          return (
            <button
              key={`${entry.title}-${realIndex}`}
              type="button"
              role="option"
              aria-selected={lit}
              className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-4 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring ${
                lit ? "bg-primary text-on-primary" : "text-foreground hover:bg-zinc-900"
              }`}
              onClick={() => setIndex(realIndex)}
            >
              <span className="min-w-0">
                <span className={`block text-[10px] uppercase tracking-[0.14em] ${lit ? "opacity-70" : "text-muted-foreground"}`}>
                  {entry.category}
                </span>
                <span className="block truncate font-display text-sm uppercase leading-tight">{entry.title}</span>
              </span>
              <span className={`shrink-0 text-[11px] uppercase tracking-[0.14em] ${lit ? "opacity-70" : "text-muted-foreground"}`}>
                {entry.meta}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NearbyRadar({ item }: { item: NearbyItem }) {
  return (
    <div className="relative h-full min-h-[220px] w-full overflow-hidden bg-ink">
      <HomeMinskMap zoom={15} />
      <svg
        viewBox="0 0 400 400"
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none absolute inset-0 h-full w-full"
        role="img"
        aria-label={`${item.category}. ${item.title}. ${item.meta}. Смена идёт к заявке.`}
      >
        {PATHS.map((path) => (
          <g key={path.d}>
            <path className="route-draw" d={path.d} pathLength={1} style={{ animationDelay: `${path.delay}s` }} />
            <path className="route-flow" d={path.d} pathLength={1} style={{ animationDelay: `${path.delay + 0.35}s` }} />
            <g
              className="route-walker"
              style={{
                offsetPath: `path("${path.d}")`,
                animationDuration: `${path.duration}s`,
                animationDelay: `${path.delay + 0.8}s`,
              }}
            >
              <circle r="4.5" cy="-6" fill="#7a5cff" />
              <rect x="-2.2" y="-1" width="4.4" height="9" fill="#7a5cff" />
            </g>
          </g>
        ))}
        <circle cx="200" cy="200" r="18" className="pin-pulse" fill="#c8f542" />
        <rect x="194.5" y="194.5" width="11" height="11" fill="#c8f542" />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/95 via-ink/70 to-transparent px-4 pb-4 pt-14">
        <p className="text-[10px] uppercase tracking-[0.16em] text-secondary">
          {item.category}
          <span className="ml-2 text-muted-foreground">{item.meta}</span>
        </p>
        <p className="mt-1 font-display text-lg uppercase leading-tight md:text-xl">{item.title}</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Идут к заявке</p>
      </div>
    </div>
  );
}
