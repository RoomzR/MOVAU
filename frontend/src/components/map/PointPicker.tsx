import OlMap from "ol/Map";
import View from "ol/View";
import Overlay from "ol/Overlay";
import TileLayer from "ol/layer/Tile";
import { defaults as defaultControls } from "ol/control/defaults";
import { fromLonLat, toLonLat, transformExtent } from "ol/proj";
import XYZ from "ol/source/XYZ";
import { boundingExtent } from "ol/extent";
import { useEffect, useRef, useState } from "react";
import "ol/ol.css";

const MINSK = { longitude: 27.5619, latitude: 53.9023 };
const DARK = "#08090c";

export type MapPoint = { latitude: number; longitude: number };

export type PointPickerMarker = MapPoint & { id: string; label: string };

type Basemap = { url: string; attr: string; sample: (z: number, x: number, y: number) => string };

const BASEMAPS: Basemap[] = [
  {
    url: "https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    attr: "© OpenStreetMap © CARTO",
    sample: (z, x, y) => `https://a.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`,
  },
  {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attr: "Tiles © Esri",
    sample: (z, x, y) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${z}/${y}/${x}`,
  },
];

type Props = {
  value: MapPoint;
  markers: PointPickerMarker[];
  selectedId: string | null;
  onPick: (point: MapPoint) => void;
  className?: string;
  hint?: string;
};

function webMercatorTile(lng: number, lat: number, z: number) {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const rad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
  return { z, x, y };
}

function probe(src: string) {
  return new Promise<boolean>((resolve) => {
    const img = new Image();
    const timer = window.setTimeout(() => resolve(false), 2500);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(true);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(false);
    };
    img.src = src;
  });
}

async function pickBasemap() {
  const tile = webMercatorTile(MINSK.longitude, MINSK.latitude, 12);
  for (const basemap of BASEMAPS) {
    if (await probe(basemap.sample(tile.z, tile.x, tile.y))) {
      return basemap;
    }
  }
  return null;
}

function pinElement(label: string, active: boolean) {
  const root = document.createElement("span");
  root.title = label;
  root.setAttribute("aria-label", label);
  root.className = `block h-3 w-3 rounded-full border-2 ${
    active ? "border-primary bg-primary shadow-[0_0_0_3px_rgba(200,245,66,.35)]" : "border-background bg-foreground"
  }`;
  return root;
}

function paintDark(map: OlMap) {
  const viewport = map.getViewport();
  viewport.style.background = DARK;
  viewport.querySelectorAll("canvas").forEach((canvas) => {
    canvas.style.background = DARK;
  });
}

function metersPerDeg(lat: number) {
  return {
    lat: 110_540,
    lng: 111_320 * Math.cos((lat * Math.PI) / 180),
  };
}

function FieldFallback({ value, markers, selectedId, onPick }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const zoom = 0.06;

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

  function project(point: MapPoint) {
    const m = metersPerDeg(value.latitude);
    return {
      x: size.width / 2 + (point.longitude - value.longitude) * m.lng * zoom,
      y: size.height / 2 - (point.latitude - value.latitude) * m.lat * zoom,
    };
  }

  return (
    <div
      ref={root}
      className="absolute inset-0 z-10 cursor-crosshair overflow-hidden bg-background"
      role="img"
      aria-label="Поле точки: клик ставит выбранную остановку"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const m = metersPerDeg(value.latitude);
        onPick({
          longitude: value.longitude + (x - rect.width / 2) / (m.lng * zoom),
          latitude: value.latitude - (y - rect.height / 2) / (m.lat * zoom),
        });
      }}
    >
      {markers.map((marker) => {
        const at = project(marker);
        const active = marker.id === selectedId;
        return (
          <span
            key={marker.id}
            className={`pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
              active ? "border-primary bg-primary" : "border-background bg-foreground"
            }`}
            style={{ left: at.x, top: at.y }}
          />
        );
      })}
    </div>
  );
}

export function PointPicker({
  value,
  markers,
  selectedId,
  onPick,
  className = "h-64",
  hint = "Клик ставит точку выбранной остановки",
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const mapRef = useRef<OlMap | null>(null);
  const overlays = useRef<Map<string, Overlay>>(new Map());
  const onPickRef = useRef(onPick);
  const [basemap, setBasemap] = useState<Basemap | null | "pending">("pending");
  onPickRef.current = onPick;

  useEffect(() => {
    let live = true;
    void pickBasemap().then((found) => {
      if (live) {
        setBasemap(found);
      }
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const node = root.current;
    if (!node || basemap === "pending" || basemap === null) {
      return;
    }
    const source = new XYZ({
      url: basemap.url,
      attributions: basemap.attr,
      maxZoom: 19,
      wrapX: false,
    });
    const map = new OlMap({
      target: node,
      layers: [new TileLayer({ source, preload: 4 })],
      controls: defaultControls({
        rotate: false,
        zoomOptions: { zoomInTipLabel: "Приблизить", zoomOutTipLabel: "Отдалить" },
        attributionOptions: { collapsed: true, collapsible: true },
      }),
      view: new View({
        center: fromLonLat([value.longitude, value.latitude]),
        zoom: 13,
        minZoom: 8,
        maxZoom: 18,
        constrainOnlyCenter: true,
        extent: transformExtent([23.17, 51.26, 32.77, 56.17], "EPSG:4326", "EPSG:3857"),
      }),
    });
    mapRef.current = map;
    paintDark(map);
    map.updateSize();
    const resize = new ResizeObserver(() => {
      map.updateSize();
      paintDark(map);
    });
    resize.observe(node);
    const onRender = () => paintDark(map);
    map.on("rendercomplete", onRender);
    map.on("singleclick", (event) => {
      const [lng, lat] = toLonLat(event.coordinate);
      onPickRef.current({ latitude: lat, longitude: lng });
    });

    return () => {
      map.un("rendercomplete", onRender);
      resize.disconnect();
      overlays.current.forEach((overlay) => map.removeOverlay(overlay));
      overlays.current.clear();
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    map.getView().setCenter(fromLonLat([value.longitude, value.latitude]));
  }, [value.latitude, value.longitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    for (const overlay of overlays.current.values()) {
      map.removeOverlay(overlay);
    }
    overlays.current.clear();
    for (const marker of markers) {
      const at = fromLonLat([marker.longitude, marker.latitude]);
      const overlay = new Overlay({
        element: pinElement(marker.label, marker.id === selectedId),
        positioning: "center-center",
        stopEvent: true,
      });
      overlay.setPosition(at);
      map.addOverlay(overlay);
      overlays.current.set(marker.id, overlay);
    }
  }, [markers, selectedId, basemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || markers.length < 2) {
      return;
    }
    const coords = markers.map((marker) => fromLonLat([marker.longitude, marker.latitude]));
    map.getView().fit(boundingExtent(coords), { padding: [32, 32, 48, 32], maxZoom: 15, duration: 200 });
    // только при смене набора остановок, не при каждом клике
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers.length, selectedId, basemap]);

  return (
    <div className={`relative overflow-hidden border border-border ${className}`} style={{ background: DARK }}>
      <div
        ref={root}
        className="movau-ol-map absolute inset-0 z-0 overflow-hidden"
        style={{ background: DARK }}
        role="application"
        aria-label="Карта точки остановки"
      />
      {basemap === null ? (
        <FieldFallback value={value} markers={markers} selectedId={selectedId} onPick={onPick} />
      ) : null}
      <p className="pointer-events-none absolute bottom-2 left-2 z-20 max-w-[calc(100%-5rem)] text-xs text-muted-foreground">
        {hint}
      </p>
    </div>
  );
}
