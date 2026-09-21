import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { listRequests } from "../api/requests";
import { listShiftLive } from "../api/shift";
import { RequestPeekCard } from "../components/map/RequestPeekCard";
import { RequestsMap } from "../components/map/RequestsMap";
import { Button } from "../components/ui/Button";
import { CategoryChip } from "../components/ui/CategoryChip";
import { CATEGORIES } from "../lib/labels";
import { useAuthStore } from "../store/authStore";

type Coords = { latitude: number; longitude: number };

const MINSK: Coords = { latitude: 53.9023, longitude: 27.5619 };

const RADII = [
  { m: 1000, label: "1 км" },
  { m: 5000, label: "5 км" },
  { m: 15000, label: "15 км" },
] as const;

export function RequestsPage() {
  const user = useAuthStore((state) => state.user);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [radiusM, setRadiusM] = useState(5000);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Геолокация недоступна в этом браузере");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGeoError(null);
      },
      () => setGeoError("Не удалось определить место. Показана карта Минска."),
    );
  }, []);

  const center = coords ?? MINSK;
  const query = useQuery({
    queryKey: ["requests", center.latitude, center.longitude, radiusM, category],
    queryFn: () =>
      listRequests({
        lat: center.latitude,
        lng: center.longitude,
        radius_m: radiusM,
        category: category ?? undefined,
      }),
  });
  const items = query.data ?? [];
  const liveQuery = useQuery({
    queryKey: ["shift", "live"],
    queryFn: listShiftLive,
    enabled: Boolean(user),
    refetchInterval: user ? 8000 : false,
  });
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const volunteerOnly = Boolean(user?.roles.includes("volunteer") && !user.roles.includes("executor"));

  useEffect(() => {
    if (selectedId && !items.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [items, selectedId]);

  return (
    <section className="relative flex min-h-0 flex-1 flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-3 p-4 md:p-6">
        <div className="flex justify-between gap-3">
          <div className="pointer-events-auto max-w-md border border-border bg-background/90 px-4 py-3 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Карта</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {volunteerOnly
                ? "Только дарма. Улицы и точки заявок."
                : "Нажмите точку на карте. Фиолет — кто на смене."}
            </p>
            {geoError ? <p className="mt-1 text-sm text-destructive">{geoError}</p> : null}
            {query.isError ? <p className="mt-1 text-sm text-destructive">Не удалось загрузить заявки.</p> : null}
          </div>
          <div className="pointer-events-auto flex flex-wrap justify-end gap-2">
            <Button onClick={locate}>{coords ? "Обновить место" : "Моё место"}</Button>
            {user ? (
              <Link to="/requests/new">
                <Button variant="accent">
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Заявка
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="accent">Войти</Button>
              </Link>
            )}
          </div>
        </div>
        <div className="pointer-events-auto max-w-3xl space-y-2">
          <div className="scroll-volt flex gap-2 overflow-x-auto pb-1">
            <FilterChip label="Все" active={category === null} onClick={() => setCategory(null)} />
            {CATEGORIES.map((row) => (
              <CategoryChip
                key={row.id}
                value={row.id}
                selected={category === row.id}
                onSelect={(value) => setCategory(value)}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {RADII.map((row) => (
              <FilterChip
                key={row.m}
                label={row.label}
                active={radiusM === row.m}
                onClick={() => setRadiusM(row.m)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="relative min-h-[70svh] flex-1">
        <RequestsMap
          items={items}
          people={liveQuery.data ?? []}
          center={center}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        {query.isLoading ? (
          <p className="absolute bottom-6 left-6 z-10 text-sm text-muted-foreground">Загружаем точки…</p>
        ) : null}
        {query.data?.length === 0 ? (
          <p className="absolute bottom-6 left-6 z-10 max-w-sm text-sm text-muted-foreground">
            {category || radiusM !== 5000
              ? "В этом радиусе нет таких заявок."
              : "Рядом пусто. Создайте заявку или сдвиньте карту позже."}
          </p>
        ) : null}
      </div>

      {selected ? (
        <div className="absolute inset-x-0 bottom-0 z-30 p-4 md:inset-auto md:bottom-6 md:right-6 md:w-[28rem]">
          <RequestPeekCard item={selected} onClose={() => setSelectedId(null)} />
        </div>
      ) : null}
    </section>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center border px-3 text-[11px] font-semibold uppercase tracking-[0.14em] ${
        active
          ? "border-primary bg-primary text-on-primary"
          : "border-border bg-background/90 text-foreground hover:border-primary hover:text-primary"
      }`}
    >
      {label}
    </button>
  );
}
