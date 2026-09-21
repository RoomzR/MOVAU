import { useEffect, useState, type ComponentType } from "react";

import type { HelpRequest, RequestLocation } from "../../types";

export type TrackMapProps = {
  request: HelpRequest;
  executor: RequestLocation | null;
};

function TrackFallback({ request, executor }: TrackMapProps) {
  return (
    <div className="relative h-64 overflow-hidden bg-[#08090C]" role="img" aria-label="Карта заявки">
      <span
        className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary"
        title="Точка заявки"
      />
      {executor ? (
        <span
          className="absolute left-[58%] top-[40%] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7A5CFF] shadow-[0_0_10px_#7A5CFF]"
          title="Исполнитель"
        />
      ) : null}
      <p className="absolute bottom-3 left-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {request.address_text || "Точка заявки"}
      </p>
    </div>
  );
}

export function RequestTrackMap(props: TrackMapProps) {
  const [MapView, setMapView] = useState<ComponentType<TrackMapProps> | null>(null);

  useEffect(() => {
    let live = true;
    void import("./OpenLayersTrackMap")
      .then((mod) => {
        if (live) {
          setMapView(() => mod.OpenLayersTrackMap);
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
    return <TrackFallback {...props} />;
  }
  return <MapView {...props} />;
}
