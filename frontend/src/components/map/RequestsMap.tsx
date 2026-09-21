import { useEffect, useState, type ComponentType } from "react";

import { NightFieldMap, type NightFieldMapProps } from "./NightFieldMap";

export function RequestsMap(props: NightFieldMapProps) {
  const [MapView, setMapView] = useState<ComponentType<NightFieldMapProps> | null>(null);

  useEffect(() => {
    let live = true;
    void import("./OpenLayersMap")
      .then((mod) => {
        if (live) {
          setMapView(() => mod.OpenLayersMap);
        }
      })
      .catch(() => {
        if (live) {
          setMapView(null);
        }
      });
    return () => {
      live = false;
    };
  }, []);

  if (!MapView) {
    return <NightFieldMap {...props} />;
  }
  return <MapView {...props} />;
}
