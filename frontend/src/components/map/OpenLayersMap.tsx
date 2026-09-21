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

import type { HelpRequest } from "../../types";
import { NightFieldMap, type NightFieldMapProps } from "./NightFieldMap";

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

function shortTitle(title: string) {
  return title.length > 22 ? `${title.slice(0, 20)}…` : title;
}

function pinElement(item: HelpRequest, selected: boolean, onSelect: (id: string) => void) {
  const root = document.createElement("button");
  root.type = "button";
  root.setAttribute("aria-label", item.title);
  root.setAttribute("aria-pressed", selected ? "true" : "false");
  root.className = `flex min-h-11 cursor-pointer items-start gap-2 text-left ${selected ? "z-20" : ""}`;
  const dot = document.createElement("span");
  dot.className = `mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 ${
    item.price ? "bg-primary" : "bg-foreground"
  } ${selected ? "border-primary shadow-[0_0_0_3px_rgba(200,245,66,.35)]" : "border-background"}`;
  const label = document.createElement("span");
  label.className =
    "max-w-[7.5rem] font-display text-[10px] font-semibold uppercase leading-tight tracking-wide text-foreground drop-shadow-[0_1px_2px_#08090C]";
  label.textContent = `${shortTitle(item.title)} · ${item.price ? `${item.price} BYN` : "дарма"}`;
  root.append(dot, label);
  root.addEventListener("click", (event) => {
    event.stopPropagation();
    onSelect(item.id);
  });
  return root;
}

function personElement(name: string) {
  const root = document.createElement("span");
  root.title = `${name} на смене`;
  root.className = "block h-2.5 w-2.5 rounded-full bg-secondary shadow-[0_0_10px_#7A5CFF]";
  return root;
}

function paintDark(map: OlMap) {
  const viewport = map.getViewport();
  viewport.style.background = DARK;
  viewport.querySelectorAll("canvas").forEach((canvas) => {
    canvas.style.background = DARK;
  });
}

export function OpenLayersMap(props: NightFieldMapProps) {
  const { items, people, center, selectedId, onSelect } = props;
  const root = useRef<HTMLDivElement>(null);
  const mapRef = useRef<OlMap | null>(null);
  const itemOverlays = useRef<Map<string, Overlay>>(new Map());
  const peopleOverlays = useRef<Map<string, Overlay>>(new Map());
  const onSelectRef = useRef(onSelect);
  const [basemap, setBasemap] = useState<Basemap | null | "pending">("pending");
  onSelectRef.current = onSelect;

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

    return () => {
      map.un("rendercomplete", onRender);
      resize.disconnect();
      itemOverlays.current.forEach((overlay) => map.removeOverlay(overlay));
      itemOverlays.current.clear();
      peopleOverlays.current.forEach((overlay) => map.removeOverlay(overlay));
      peopleOverlays.current.clear();
      map.setTarget(undefined);
      mapRef.current = null;
    };
    // центр двигаем отдельным эффектом
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    map.getView().setCenter(fromLonLat([center.longitude, center.latitude]));
  }, [center.latitude, center.longitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    for (const overlay of itemOverlays.current.values()) {
      map.removeOverlay(overlay);
    }
    itemOverlays.current.clear();
    const coords: number[][] = [];
    for (const item of items) {
      const at = fromLonLat([item.longitude, item.latitude]);
      coords.push(at);
      const overlay = new Overlay({
        element: pinElement(item, item.id === selectedId, (id) => onSelectRef.current(id)),
        positioning: "center-left",
        stopEvent: true,
      });
      overlay.setPosition(at);
      map.addOverlay(overlay);
      itemOverlays.current.set(item.id, overlay);
    }
    if (coords.length > 0 && !selectedId) {
      map.getView().fit(boundingExtent(coords), { padding: [96, 48, 160, 48], maxZoom: 15, duration: 200 });
    }
  }, [items, selectedId, basemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const keep = new Set(people.map((person) => person.id));
    for (const [id, overlay] of peopleOverlays.current) {
      if (!keep.has(id)) {
        map.removeOverlay(overlay);
        peopleOverlays.current.delete(id);
      }
    }
    for (const person of people) {
      const at = fromLonLat([person.longitude, person.latitude]);
      const existing = peopleOverlays.current.get(person.id);
      if (existing) {
        existing.setPosition(at);
        continue;
      }
      const overlay = new Overlay({
        element: personElement(person.display_name),
        positioning: "center-center",
        stopEvent: false,
      });
      overlay.setPosition(at);
      map.addOverlay(overlay);
      peopleOverlays.current.set(person.id, overlay);
    }
  }, [people, basemap]);

  if (basemap === "pending" || basemap === null) {
    return <NightFieldMap {...props} />;
  }

  return (
    <div
      ref={root}
      className="movau-ol-map absolute inset-0 z-0 overflow-hidden"
      style={{ background: DARK }}
      role="application"
      aria-label="Карта заявок"
    />
  );
}
