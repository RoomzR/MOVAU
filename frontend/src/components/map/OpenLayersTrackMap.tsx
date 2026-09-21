import OlMap from "ol/Map";
import View from "ol/View";
import Overlay from "ol/Overlay";
import TileLayer from "ol/layer/Tile";
import { defaults as defaultControls } from "ol/control/defaults";
import { fromLonLat, transformExtent } from "ol/proj";
import XYZ from "ol/source/XYZ";
import { boundingExtent } from "ol/extent";
import { useEffect, useRef, useState } from "react";
import "ol/ol.css";

import type { TrackMapProps } from "./RequestTrackMap";

const DARK = "#08090c";
const EXEC = "#7A5CFF";

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
  const tile = webMercatorTile(27.5619, 53.9023, 12);
  for (const basemap of BASEMAPS) {
    if (await probe(basemap.sample(tile.z, tile.x, tile.y))) {
      return basemap;
    }
  }
  return null;
}

function dot(color: string, label: string) {
  const root = document.createElement("span");
  root.title = label;
  root.setAttribute("aria-label", label);
  root.className = "block h-3 w-3 rounded-full border-2 border-[#08090c]";
  root.style.background = color;
  if (color === EXEC) {
    root.style.boxShadow = "0 0 10px #7A5CFF";
  }
  return root;
}

function paintDark(map: OlMap) {
  const viewport = map.getViewport();
  viewport.style.background = DARK;
  viewport.querySelectorAll("canvas").forEach((canvas) => {
    canvas.style.background = DARK;
  });
}

export function OpenLayersTrackMap({ request, executor }: TrackMapProps) {
  const root = useRef<HTMLDivElement>(null);
  const mapRef = useRef<OlMap | null>(null);
  const requestOverlay = useRef<Overlay | null>(null);
  const execOverlay = useRef<Overlay | null>(null);
  const [basemap, setBasemap] = useState<Basemap | null | "pending">("pending");

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
        center: fromLonLat([request.longitude, request.latitude]),
        zoom: 14,
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
    return () => {
      map.un("rendercomplete", onRender);
      resize.disconnect();
      map.setTarget(undefined);
      mapRef.current = null;
      requestOverlay.current = null;
      execOverlay.current = null;
    };
  }, [basemap, request.latitude, request.longitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const at = fromLonLat([request.longitude, request.latitude]);
    if (!requestOverlay.current) {
      const overlay = new Overlay({
        element: dot("#C8F542", "Точка заявки"),
        positioning: "center-center",
        stopEvent: false,
      });
      map.addOverlay(overlay);
      requestOverlay.current = overlay;
    }
    requestOverlay.current.setPosition(at);
    const coords = [at];
    if (executor) {
      const execAt = fromLonLat([executor.longitude, executor.latitude]);
      coords.push(execAt);
      if (!execOverlay.current) {
        const overlay = new Overlay({
          element: dot(EXEC, "Исполнитель"),
          positioning: "center-center",
          stopEvent: false,
        });
        map.addOverlay(overlay);
        execOverlay.current = overlay;
      }
      execOverlay.current.setPosition(execAt);
    } else if (execOverlay.current) {
      map.removeOverlay(execOverlay.current);
      execOverlay.current = null;
    }
    map.getView().fit(boundingExtent(coords), { padding: [48, 48, 48, 48], maxZoom: 16, duration: 200 });
  }, [basemap, executor, request.latitude, request.longitude]);

  if (basemap === "pending" || basemap === null) {
    return (
      <div className="relative h-64 overflow-hidden bg-[#08090C]" aria-label="Карта заявки">
        <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
      </div>
    );
  }

  return (
    <div
      ref={root}
      className="movau-ol-map relative z-0 h-64 overflow-hidden"
      style={{ background: DARK }}
      role="application"
      aria-label="Карта заявки"
    />
  );
}
