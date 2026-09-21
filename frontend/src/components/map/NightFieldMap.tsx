import { Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import type { HelpRequest, ShiftLivePerson } from "../../types";

export type NightFieldMapProps = {
  items: HelpRequest[];
  people: ShiftLivePerson[];
  center: { latitude: number; longitude: number };
  selectedId: string | null;
  onSelect: (id: string) => void;
};

type View = { zoom: number; panX: number; panY: number };

const MIN_ZOOM = 0.012;
const MAX_ZOOM = 0.42;

function metersPerDeg(lat: number) {
  return {
    lat: 110_540,
    lng: 111_320 * Math.cos((lat * Math.PI) / 180),
  };
}

function project(
  lat: number,
  lng: number,
  origin: { latitude: number; longitude: number },
  view: View,
  width: number,
  height: number,
) {
  const m = metersPerDeg(origin.latitude);
  return {
    x: width / 2 + view.panX + (lng - origin.longitude) * m.lng * view.zoom,
    y: height / 2 + view.panY - (lat - origin.latitude) * m.lat * view.zoom,
  };
}

function fitView(
  points: { latitude: number; longitude: number }[],
  origin: { latitude: number; longitude: number },
  width: number,
  height: number,
): View {
  if (width < 8 || height < 8) {
    return { zoom: 0.06, panX: 0, panY: 0 };
  }
  if (points.length === 0) {
    return { zoom: 0.06, panX: 0, panY: 0 };
  }
  const m = metersPerDeg(origin.latitude);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    const x = (point.longitude - origin.longitude) * m.lng;
    const y = -(point.latitude - origin.latitude) * m.lat;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const spanX = Math.max(maxX - minX, 180);
  const spanY = Math.max(maxY - minY, 180);
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min((width - 120) / spanX, (height - 120) / spanY)));
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  return { zoom, panX: -midX * zoom, panY: -midY * zoom };
}

function shortTitle(title: string) {
  return title.length > 22 ? `${title.slice(0, 20)}…` : title;
}

export function NightFieldMap({ items, people, center, selectedId, onSelect }: NightFieldMapProps) {
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; panX: number; panY: number } | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<View>({ zoom: 0.06, panX: 0, panY: 0 });

  useEffect(() => {
    const node = root.current;
    if (!node) {
      return;
    }
    const update = () => {
      const rect = node.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const itemKey = items.map((item) => item.id).join(",");

  useEffect(() => {
    const points = [
      ...items.map((item) => ({ latitude: item.latitude, longitude: item.longitude })),
      center,
    ];
    setView(fitView(points, center, size.width, size.height));
  }, [center, itemKey, items, size.height, size.width]);

  const grid = useMemo(() => {
    if (size.width < 8) {
      return [] as string[];
    }
    const rings = [400, 900, 1600, 2500];
    const rays = 12;
    const paths: string[] = [];
    for (const meters of rings) {
      const pts: string[] = [];
      for (let i = 0; i <= 48; i += 1) {
        const a = (i / 48) * Math.PI * 2;
        const lat = center.latitude + (Math.sin(a) * meters) / 110_540;
        const lng = center.longitude + (Math.cos(a) * meters) / (111_320 * Math.cos((center.latitude * Math.PI) / 180));
        const p = project(lat, lng, center, view, size.width, size.height);
        pts.push(`${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      }
      paths.push(`${pts.join(" ")} Z`);
    }
    for (let i = 0; i < rays; i += 1) {
      const a = (i / rays) * Math.PI * 2;
      const lat = center.latitude + (Math.sin(a) * 2800) / 110_540;
      const lng = center.longitude + (Math.cos(a) * 2800) / (111_320 * Math.cos((center.latitude * Math.PI) / 180));
      const inner = project(center.latitude, center.longitude, center, view, size.width, size.height);
      const outer = project(lat, lng, center, view, size.width, size.height);
      paths.push(`M${inner.x.toFixed(1)},${inner.y.toFixed(1)} L${outer.x.toFixed(1)},${outer.y.toFixed(1)}`);
    }
    return paths;
  }, [center, size.height, size.width, view]);

  const zoomBy = useCallback((factor: number) => {
    setView((current) => ({
      ...current,
      zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.zoom * factor)),
    }));
  }, []);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, panX: view.panX, panY: view.panY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.id !== event.pointerId) {
      return;
    }
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    setView((current) => ({ ...current, panX: drag.current!.panX + dx, panY: drag.current!.panY + dy }));
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (drag.current?.id === event.pointerId) {
      drag.current = null;
    }
  }

  useEffect(() => {
    const node = root.current;
    if (!node) {
      return;
    }
    const onWheelNative = (event: WheelEvent) => {
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const factor = event.deltaY > 0 ? 0.86 : 1.16;
      const cx = event.clientX - rect.left;
      const cy = event.clientY - rect.top;
      setView((current) => {
        const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.zoom * factor));
        const k = nextZoom / current.zoom;
        return {
          zoom: nextZoom,
          panX: cx - (cx - (rect.width / 2 + current.panX)) * k - rect.width / 2,
          panY: cy - (cy - (rect.height / 2 + current.panY)) * k - rect.height / 2,
        };
      });
    };
    node.addEventListener("wheel", onWheelNative, { passive: false });
    return () => node.removeEventListener("wheel", onWheelNative);
  }, []);

  return (
    <div
      ref={root}
      className="absolute inset-0 z-0 touch-none overflow-hidden bg-background"
      role="application"
      aria-label="Ночная карта заявок"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="movau-night" cx="50%" cy="42%" r="68%">
            <stop offset="0%" stopColor="#16181c" />
            <stop offset="55%" stopColor="#0d0f12" />
            <stop offset="100%" stopColor="#08090c" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#movau-night)" />
        {grid.map((d, index) => (
          <path key={d} d={d} fill="none" stroke={index < 4 ? "#27272a" : "#1c1e22"} strokeWidth={index < 4 ? 1 : 0.6} />
        ))}
      </svg>

      {people.map((person) => {
        const point = project(person.latitude, person.longitude, center, view, size.width, size.height);
        return (
          <span
            key={person.id}
            title={`${person.display_name} на смене`}
            className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary shadow-[0_0_10px_#7A5CFF]"
            style={{ left: point.x, top: point.y }}
          />
        );
      })}

      {items.map((item) => {
        const point = project(item.latitude, item.longitude, center, view, size.width, size.height);
        const selected = item.id === selectedId;
        const label = `${shortTitle(item.title)} · ${item.price ? `${item.price} BYN` : "дарма"}`;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`absolute z-10 flex min-h-11 -translate-x-2 -translate-y-4 cursor-pointer items-start gap-2 text-left ${selected ? "z-20" : ""}`}
            style={{ left: point.x, top: point.y }}
            aria-pressed={selected}
            aria-label={item.title}
          >
            <span
              className={`mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 ${
                item.price ? "bg-primary" : "bg-foreground"
              } ${selected ? "border-primary shadow-[0_0_0_3px_rgba(200,245,66,.35)]" : "border-background"}`}
            />
            <span className="max-w-[7.5rem] font-display text-[10px] font-semibold uppercase leading-tight tracking-wide text-foreground drop-shadow-[0_1px_2px_#08090C]">
              {label}
            </span>
          </button>
        );
      })}

      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center border border-border bg-background/90 text-foreground hover:border-primary hover:text-primary"
          aria-label="Приблизить"
          onClick={() => zoomBy(1.2)}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center border border-border bg-background/90 text-foreground hover:border-primary hover:text-primary"
          aria-label="Отдалить"
          onClick={() => zoomBy(1 / 1.2)}
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
