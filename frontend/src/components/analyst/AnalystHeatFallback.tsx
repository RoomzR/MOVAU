import { Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import type { AnalystCell } from "../../types";
import { cellKey } from "./cellKey";

type View = { zoom: number; panX: number; panY: number };

const MIN_ZOOM = 0.012;
const MAX_ZOOM = 0.42;

type Props = {
  cells: AnalystCell[];
  center: { latitude: number; longitude: number };
  selected: AnalystCell | null;
  onSelect: (cell: AnalystCell | null) => void;
};

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
  if (width < 8 || height < 8 || points.length === 0) {
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
  return { zoom, panX: -((minX + maxX) / 2) * zoom, panY: -((minY + maxY) / 2) * zoom };
}

export function AnalystHeatFallback({ cells, center, selected, onSelect }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; panX: number; panY: number } | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<View>({ zoom: 0.06, panX: 0, panY: 0 });
  const max = Math.max(1, ...cells.map((cell) => cell.count));
  const selectedKey = selected ? cellKey(selected) : null;

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

  const cellSig = cells.map((cell) => cellKey(cell)).join(",");

  useEffect(() => {
    const points = cells.map((cell) => ({ latitude: cell.lat, longitude: cell.lng }));
    setView(fitView(points.length ? points : [center], center, size.width, size.height));
  }, [center, cellSig, cells, size.height, size.width]);

  const grid = useMemo(() => {
    if (size.width < 8) {
      return [] as string[];
    }
    const rings = [400, 900, 1600, 2500];
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

  return (
    <div
      ref={root}
      className="absolute inset-0 z-0 touch-none overflow-hidden bg-background"
      role="application"
      aria-label="Тепловая карта заявок"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <rect width="100%" height="100%" fill="#08090c" />
        {grid.map((d) => (
          <path key={d} d={d} fill="none" stroke="#27272a" strokeWidth={1} />
        ))}
      </svg>
      {cells.map((cell) => {
        const point = project(cell.lat, cell.lng, center, view, size.width, size.height);
        const active = cellKey(cell) === selectedKey;
        const radius = 8 + Math.sqrt(cell.count / max) * 22;
        return (
          <button
            key={cellKey(cell)}
            type="button"
            onClick={() => onSelect(active ? null : cell)}
            className={`absolute z-10 flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center ${active ? "z-20" : ""}`}
            style={{ left: point.x, top: point.y }}
            aria-pressed={active}
            aria-label={`${cell.count} заявок`}
          >
            <span
              className={`block rounded-full border-2 ${
                active ? "border-primary bg-primary/40" : "border-primary/40 bg-primary/20"
              }`}
              style={{ width: radius * 2, height: radius * 2 }}
              aria-hidden="true"
            />
            {active ? (
              <span className="absolute font-display text-xs text-foreground">{cell.count}</span>
            ) : null}
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
