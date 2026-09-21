import OlMap from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import { fromLonLat } from "ol/proj";
import XYZ from "ol/source/XYZ";
import { useEffect, useRef, useState } from "react";
import "ol/ol.css";

const MINSK = { longitude: 27.5619, latitude: 53.9023 };
const DARK = "#08090c";

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
  const tile = webMercatorTile(MINSK.longitude, MINSK.latitude, 12);
  for (const basemap of BASEMAPS) {
    if (await probe(basemap.sample(tile.z, tile.x, tile.y))) {
      return basemap;
    }
  }
  return null;
}

type Props = {
  className?: string;
  zoom?: number;
};

/** Тёмная карта Мінска. Без жестов — не перехватывает слайды главной. */
export function HomeMinskMap({ className = "", zoom = 14 }: Props) {
  const root = useRef<HTMLDivElement>(null);
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
    const map = new OlMap({
      target: node,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: basemap.url,
            attributions: basemap.attr,
            maxZoom: 19,
            wrapX: false,
          }),
          preload: 2,
        }),
      ],
      controls: [],
      interactions: [],
      view: new View({
        center: fromLonLat([MINSK.longitude, MINSK.latitude]),
        zoom,
        minZoom: zoom,
        maxZoom: zoom,
      }),
    });
    const viewport = map.getViewport();
    viewport.style.background = DARK;
    map.updateSize();
    const resize = new ResizeObserver(() => map.updateSize());
    resize.observe(node);
    return () => {
      resize.disconnect();
      map.setTarget(undefined);
    };
  }, [basemap, zoom]);

  return (
    <div
      ref={root}
      className={`movau-ol-map pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ background: DARK }}
      aria-hidden="true"
    />
  );
}
