import Feature from "ol/Feature";
import type { FeatureLike } from "ol/Feature";
import OlMap from "ol/Map";
import Overlay from "ol/Overlay";
import View from "ol/View";
import { defaults as defaultControls } from "ol/control/defaults";
import { boundingExtent, buffer as bufferExtent } from "ol/extent";
import Point from "ol/geom/Point";
import Heatmap from "ol/layer/Heatmap";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import { fromLonLat, transformExtent } from "ol/proj";
import VectorSource from "ol/source/Vector";
import XYZ from "ol/source/XYZ";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { useEffect, useRef, useState } from "react";
import "ol/ol.css";

import type { AnalystCell } from "../../types";
import { AnalystHeatFallback } from "./AnalystHeatFallback";
import { cellKey } from "./cellKey";

const MINSK = { longitude: 27.5619, latitude: 53.9023 };
const DARK = "#08090c";
const PAD_M = 2500;

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
  cells: AnalystCell[];
  center: { latitude: number; longitude: number };
  selected: AnalystCell | null;
  onSelect: (cell: AnalystCell | null) => void;
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

function paintDark(map: OlMap) {
  map.getViewport().style.background = DARK;
}

function countBadge(count: number) {
  const root = document.createElement("span");
  root.className =
    "flex min-h-11 min-w-11 items-center justify-center border border-primary bg-background/95 px-2 font-display text-sm text-foreground";
  root.textContent = String(count);
  return root;
}

function circleStyle(selectedKey: string | null) {
  return (feature: FeatureLike) => {
    const cell = feature.get("cell") as AnalystCell | undefined;
    const max = Number(feature.get("max") ?? 1);
    if (!cell) {
      return undefined;
    }
    const active = selectedKey === cellKey(cell);
    const radius = 8 + Math.sqrt(cell.count / Math.max(1, max)) * 18;
    return new Style({
      image: new CircleStyle({
        radius,
        fill: new Fill({ color: active ? "rgba(200,245,66,0.45)" : "rgba(200,245,66,0.22)" }),
        stroke: new Stroke({ color: active ? "#C8F542" : "rgba(122,92,255,0.8)", width: active ? 2 : 1.5 }),
      }),
    });
  };
}

export function AnalystHeatMap({ cells, center, selected, onSelect }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const mapRef = useRef<OlMap | null>(null);
  const sourceRef = useRef<VectorSource | null>(null);
  const vectorRef = useRef<VectorLayer<VectorSource> | null>(null);
  const badgeRef = useRef<Overlay | null>(null);
  const onSelectRef = useRef(onSelect);
  const [basemap, setBasemap] = useState<Basemap | null | "pending">("pending");
  onSelectRef.current = onSelect;
  const selectedKey = selected ? cellKey(selected) : null;

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
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const source = new VectorSource();
    sourceRef.current = source;
    const vector = new VectorLayer({
      source,
      zIndex: 2,
      style: circleStyle(null),
    });
    vectorRef.current = vector;
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
          preload: 4,
        }),
        new Heatmap({
          source,
          zIndex: 1,
          blur: reduced ? 8 : 24,
          radius: reduced ? 12 : 28,
          weight: (feature) => Number(feature.get("weight") ?? 0),
          gradient: ["#7A5CFF", "#C8F542"],
        }),
        vector,
      ],
      controls: defaultControls({
        rotate: false,
        zoomOptions: { zoomInTipLabel: "Приблизить", zoomOutTipLabel: "Отдалить" },
        attributionOptions: { collapsed: true, collapsible: true },
      }),
      view: new View({
        center: fromLonLat([center.longitude, center.latitude]),
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
      const hit = map.forEachFeatureAtPixel(
        event.pixel,
        (feature) => feature,
        { hitTolerance: 16, layerFilter: (layer) => layer === vectorRef.current },
      );
      if (hit) {
        onSelectRef.current((hit.get("cell") as AnalystCell) ?? null);
        return;
      }
      const heatSource = sourceRef.current;
      if (!heatSource || heatSource.getFeatures().length === 0) {
        onSelectRef.current(null);
        return;
      }
      const closest = heatSource.getClosestFeatureToCoordinate(event.coordinate);
      if (!closest) {
        onSelectRef.current(null);
        return;
      }
      const geom = closest.getGeometry();
      if (!(geom instanceof Point)) {
        onSelectRef.current(null);
        return;
      }
      const pixel = map.getPixelFromCoordinate(geom.getCoordinates());
      const click = map.getPixelFromCoordinate(event.coordinate);
      if (Math.hypot(pixel[0] - click[0], pixel[1] - click[1]) > 48) {
        onSelectRef.current(null);
        return;
      }
      onSelectRef.current(closest.get("cell") as AnalystCell);
    });

    return () => {
      map.un("rendercomplete", onRender);
      resize.disconnect();
      if (badgeRef.current) {
        map.removeOverlay(badgeRef.current);
        badgeRef.current = null;
      }
      map.setTarget(undefined);
      mapRef.current = null;
      sourceRef.current = null;
      vectorRef.current = null;
    };
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    map.getView().setCenter(fromLonLat([center.longitude, center.latitude]));
  }, [center.latitude, center.longitude, basemap]);

  useEffect(() => {
    const map = mapRef.current;
    const source = sourceRef.current;
    if (!map || !source) {
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    source.clear();
    const max = Math.max(1, ...cells.map((cell) => cell.count));
    const coords: number[][] = [];
    for (const cell of cells) {
      const at = fromLonLat([cell.lng, cell.lat]);
      coords.push(at);
      const feature = new Feature({ geometry: new Point(at) });
      feature.set("weight", cell.count / max);
      feature.set("max", max);
      feature.set("cell", cell);
      source.addFeature(feature);
    }
    if (coords.length > 0) {
      const extent = bufferExtent(boundingExtent(coords), PAD_M);
      map.getView().fit(extent, {
        padding: [96, 48, 96, 48],
        maxZoom: 14,
        duration: reduced ? 0 : 200,
      });
    }
  }, [cells, basemap]);

  useEffect(() => {
    vectorRef.current?.setStyle(circleStyle(selectedKey));
  }, [selectedKey, basemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    if (badgeRef.current) {
      map.removeOverlay(badgeRef.current);
      badgeRef.current = null;
    }
    if (!selected) {
      return;
    }
    const overlay = new Overlay({
      element: countBadge(selected.count),
      positioning: "center-center",
      stopEvent: false,
    });
    overlay.setPosition(fromLonLat([selected.lng, selected.lat]));
    map.addOverlay(overlay);
    badgeRef.current = overlay;
  }, [selected, basemap]);

  const selectedCount = selected?.count ?? null;

  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-0 flex-1 overflow-hidden" style={{ background: DARK }}>
        <div
          ref={root}
          className={`movau-ol-map movau-ol-heat absolute inset-0 z-0 overflow-hidden ${basemap === null ? "hidden" : ""}`}
          style={{ background: DARK }}
          role="application"
          aria-label="Тепловая карта заявок"
        />
        {basemap === null ? (
          <AnalystHeatFallback cells={cells} center={center} selected={selected} onSelect={onSelect} />
        ) : null}
      </div>
      <HeatLegend count={selectedCount} />
    </div>
  );
}

function HeatLegend({ count }: { count: number | null }) {
  return (
    <p className="flex flex-wrap items-center gap-3 border-t border-border bg-background px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      <span>Холодно</span>
      <span className="h-2 min-w-24 flex-1 bg-gradient-to-r from-secondary to-primary" aria-hidden="true" />
      <span>Тепло</span>
      <span>Горячо</span>
      {count != null ? (
        <span className="ml-auto text-foreground">
          Ячейка · {count} {count === 1 ? "заявка" : "заявок"}
        </span>
      ) : (
        <span className="ml-auto">Нажмите ячейку</span>
      )}
    </p>
  );
}
