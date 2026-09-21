import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import { fetchAnalystOverview } from "../api/cabinets";
import { AdminFilterChip } from "../components/admin/AdminFilterChip";
import { AdminTable } from "../components/admin/AdminTable";
import { AnalystCellCard } from "../components/analyst/AnalystCellCard";
import { AnalystFunnel } from "../components/analyst/AnalystFunnel";
import { AnalystHeatMap } from "../components/analyst/AnalystHeatMap";
import { cellKey } from "../components/analyst/cellKey";
import { DayBars } from "../components/analyst/DayBars";
import { Page } from "../components/layout/Page";
import { Section } from "../components/layout/Section";
import { StatGrid, StatTile } from "../components/ui/StatTile";
import { categoryLabel, formatMoney } from "../lib/labels";
import { useAuthStore } from "../store/authStore";
import type { AnalystCell } from "../types";

const PERIODS = [
  { days: 7, label: "7 дней" },
  { days: 30, label: "30 дней" },
  { days: 90, label: "90 дней" },
] as const;

const MINSK = { latitude: 53.9023, longitude: 27.5619 };
const EMPTY_FUNNEL = { created: 0, taken: 0, completed: 0, cancelled: 0 };

export function AnalystPage() {
  const user = useAuthStore((state) => state.user);
  const allowed = Boolean(user?.roles.includes("analyst") || user?.roles.includes("admin"));
  const [days, setDays] = useState<7 | 30 | 90>(7);
  const [selected, setSelected] = useState<AnalystCell | null>(null);
  const query = useQuery({
    queryKey: ["analyst", "overview", days],
    queryFn: () => fetchAnalystOverview(days),
    enabled: allowed,
  });
  const cells = query.data?.cells ?? [];
  const center = useMemo(() => {
    const first = cells[0];
    return first ? { latitude: first.lat, longitude: first.lng } : MINSK;
  }, [cells]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  const data = query.data;
  const hot = cells.slice(0, 5);
  const maxCat = Math.max(1, ...(data?.categories.map((row) => row.count) ?? [0]));
  const emptyPeriod = (data?.created ?? 0) === 0 && (data?.completed ?? 0) === 0;
  const selectedKey = selected ? cellKey(selected) : null;

  return (
    <Section className="py-12 md:py-16">
      <Page>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Метрики</p>
        <h1 className="mt-2 font-display text-5xl uppercase leading-[1.05] tracking-tight md:text-6xl">Аналитика</h1>
        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Период">
          {PERIODS.map((row) => (
            <AdminFilterChip
              key={row.days}
              label={row.label}
              active={days === row.days}
              onClick={() => {
                setDays(row.days);
                setSelected(null);
              }}
            />
          ))}
        </div>
        {query.isLoading ? <p className="mt-8 text-sm text-muted-foreground">Загружаем…</p> : null}

        <h2 className="mt-12 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Сейчас</h2>
        <StatGrid>
          <StatTile label="Люди">{data?.users ?? 0}</StatTile>
          <StatTile label="На смене" className="sm:border-r-0">
            {data?.on_shift ?? 0}
          </StatTile>
          <StatTile label="Открытые заявки">{data?.open_requests ?? 0}</StatTile>
          <StatTile label="Открытые споры" className="sm:border-r-0">
            {data?.open_disputes ?? 0}
          </StatTile>
          <StatTile label="Холд" className="border-b-0 sm:col-span-2 sm:border-r-0">
            {formatMoney(data?.held_amount)} BYN
          </StatTile>
        </StatGrid>

        <h2 className="mt-12 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Воронка</h2>
        <p className="mt-2 text-sm text-muted-foreground">Заявки, созданные в окне, и их текущий статус.</p>
        <AnalystFunnel funnel={data?.funnel ?? EMPTY_FUNNEL} />

        <h2 className="mt-12 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Подбор CTR</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ranked — баллы дистанция + навык + карма. Random — тот же пул в случайном порядке.
        </p>
        <StatGrid>
          <StatTile label="Ranked CTR">{data?.match_ctr?.ranked_pct ?? 0}%</StatTile>
          <StatTile label="Random CTR" className="sm:border-r-0">
            {data?.match_ctr?.random_pct ?? 0}%
          </StatTile>
          <StatTile label="Ranked показы / клики">
            {data?.match_ctr?.ranked_impressions ?? 0} / {data?.match_ctr?.ranked_clicks ?? 0}
          </StatTile>
          <StatTile label="Random показы / клики" className="sm:border-r-0">
            {data?.match_ctr?.random_impressions ?? 0} / {data?.match_ctr?.random_clicks ?? 0}
          </StatTile>
        </StatGrid>

        <h2 className="mt-12 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Конверсия</h2>
        <StatGrid>
          <StatTile label="Выполнено">{data?.complete_pct ?? 0}%</StatTile>
          <StatTile label="Отменено" className="sm:border-r-0">
            {data?.cancel_pct ?? 0}%
          </StatTile>
          <StatTile label="Медиана часов" className="border-b-0 sm:col-span-2 sm:border-r-0">
            {data?.median_complete_hours == null ? "—" : `${data.median_complete_hours} ч`}
          </StatTile>
        </StatGrid>

        {emptyPeriod && !query.isLoading ? (
          <p className="mt-8 text-sm text-muted-foreground">Нет заявок за период.</p>
        ) : null}
        {data?.series.length ? <DayBars series={data.series} /> : null}

        <h2 className="mt-12 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Тепловизор</h2>
        <p className="mt-2 text-sm text-muted-foreground">Плотность заявок по ячейкам. Нажмите пятно — число, не «Возьмусь».</p>
        <div className="relative mt-6 h-[32rem] overflow-hidden border border-border">
          <AnalystHeatMap cells={cells} center={center} selected={selected} onSelect={setSelected} />
          {emptyPeriod && !query.isLoading ? (
            <p className="pointer-events-none absolute bottom-16 left-4 z-10 text-sm text-muted-foreground">
              Нет заявок за период.
            </p>
          ) : null}
          {selected ? (
            <div className="absolute inset-x-0 bottom-16 z-20 p-4 md:inset-auto md:bottom-16 md:right-4 md:w-80">
              <AnalystCellCard cell={selected} onClose={() => setSelected(null)} />
            </div>
          ) : null}
        </div>

        <h2 className="mt-12 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Горячие точки</h2>
        <AdminTable columns={["Координаты", "Заявки"]} loading={query.isLoading} empty={!query.isLoading && hot.length === 0 ? "Нет ячеек за период." : undefined}>
          {hot.map((row) => {
            const active = cellKey(row) === selectedKey;
            return (
              <tr key={cellKey(row)} className="border-t border-border">
                <td className="px-4 py-4">
                  <button
                    type="button"
                    className={`min-h-11 cursor-pointer text-left font-medium hover:text-primary ${active ? "text-primary" : ""}`}
                    onClick={() => setSelected(active ? null : row)}
                  >
                    {row.lat.toFixed(4)}, {row.lng.toFixed(4)}
                  </button>
                </td>
                <td className="px-4 py-4">{row.count}</td>
              </tr>
            );
          })}
        </AdminTable>

        <h2 className="mt-12 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Категории</h2>
        <AdminTable columns={["Категория", "Заявки", "Доля"]} loading={query.isLoading}>
          {(data?.categories ?? []).map((row) => (
            <tr key={row.category} className="border-t border-border">
              <td className="px-4 py-4 font-medium">{categoryLabel(row.category)}</td>
              <td className="px-4 py-4">{row.count}</td>
              <td className="px-4 py-4">
                <span className="flex items-center gap-3">
                  <span className="h-2 min-w-0 flex-1 bg-zinc-800" aria-hidden="true">
                    <span
                      className="block h-2 bg-primary motion-reduce:transition-none"
                      style={{ width: `${Math.round((row.count / maxCat) * 100)}%` }}
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right text-sm text-muted-foreground">{row.count}</span>
                </span>
              </td>
            </tr>
          ))}
        </AdminTable>
      </Page>
    </Section>
  );
}
