import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { createBusinessBatch, fetchBusinessMe, fetchBusinessRequests } from "../api/cabinets";
import { ApiError } from "../api/client";
import { AdminPager } from "../components/admin/AdminPager";
import { AdminSearch } from "../components/admin/AdminSearch";
import { AdminTable } from "../components/admin/AdminTable";
import { PointPicker } from "../components/map/PointPicker";
import { Page } from "../components/layout/Page";
import { Section } from "../components/layout/Section";
import { Button } from "../components/ui/Button";
import { CategoryPicker, StatusChip } from "../components/ui/CategoryChip";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { formatMoney } from "../lib/labels";
import { useDebouncedValue } from "../lib/useDebounced";
import { useAuthStore } from "../store/authStore";
import type { HelpRequest } from "../types";

const MINSK = { latitude: 53.9023, longitude: 27.5619 };

type Stop = {
  title: string;
  address: string;
  price: string;
  latitude: number;
  longitude: number;
};

function emptyStop(): Stop {
  return { title: "", address: "", price: "", ...MINSK };
}

function formatPoint(lat: number, lng: number) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function BusinessPage() {
  const user = useAuthStore((state) => state.user);
  const allowed = Boolean(user?.roles.includes("business") || user?.roles.includes("admin"));
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const search = useDebouncedValue(q);
  const [category, setCategory] = useState("errand");
  const [description, setDescription] = useState("");
  const [stops, setStops] = useState<Stop[]>([emptyStop(), emptyStop()]);
  const [selected, setSelected] = useState(0);
  const [created, setCreated] = useState<HelpRequest[] | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const stats = useQuery({
    queryKey: ["business", "me"],
    queryFn: fetchBusinessMe,
    enabled: allowed,
  });
  const list = useQuery({
    queryKey: ["business", "requests", search, offset],
    queryFn: () => fetchBusinessRequests({ q: search, offset }),
    enabled: allowed,
  });
  const batch = useMutation({
    mutationFn: () =>
      createBusinessBatch(
        stops.map((stop) => ({
          title: stop.title.trim(),
          description: description.trim(),
          category,
          latitude: stop.latitude,
          longitude: stop.longitude,
          address_text: stop.address.trim() || undefined,
          price: stop.price.trim() ? Number(stop.price) : null,
        })),
      ),
    onSuccess: async (rows) => {
      setCreated(rows);
      setStops([emptyStop(), emptyStop()]);
      setSelected(0);
      await queryClient.invalidateQueries({ queryKey: ["business"] });
    },
  });
  const page = list.data;
  const error =
    list.error instanceof ApiError || list.error instanceof Error
      ? list.error.message
      : batch.error instanceof ApiError || batch.error instanceof Error
        ? batch.error.message
        : null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!allowed) {
    return <Navigate to="/me" replace />;
  }

  const data = stats.data;

  function patchStop(index: number, patch: Partial<Stop>) {
    setStops((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function locate(index: number) {
    setSelected(index);
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Геолокация недоступна в этом браузере");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        patchStop(index, { latitude: position.coords.latitude, longitude: position.coords.longitude });
      },
      () => setGeoError("Не удалось определить координаты"),
    );
  }

  const active = stops[selected] ?? stops[0];

  return (
    <Section className="py-12 md:py-16">
      <Page>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">B2B</p>
        <h1 className="mt-2 font-display text-5xl uppercase leading-[1.05] tracking-tight md:text-6xl">Бизнес</h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Пакетные заявки: у каждой остановки своя точка на карте, не все в одном Минске.
        </p>
        <dl className="mt-10 grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-b border-border p-6 sm:border-r">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Заявки</dt>
            <dd className="mt-3 font-display text-2xl">{data?.requests ?? 0}</dd>
          </div>
          <div className="border-b border-border p-6 lg:border-r">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Выполнено</dt>
            <dd className="mt-3 font-display text-2xl">{data?.completed ?? 0}</dd>
          </div>
          <div className="border-b border-border p-6 sm:border-r lg:border-b-0">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Выплачено</dt>
            <dd className="mt-3 font-display text-2xl">{formatMoney(data?.spent)} BYN</dd>
          </div>
          <div className="p-6">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">На холде</dt>
            <dd className="mt-3 font-display text-2xl">{formatMoney(data?.held)} BYN</dd>
          </div>
        </dl>

        <h2 className="mt-16 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Пакет</h2>
        <form
          className="mt-6 space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            batch.mutate();
          }}
        >
          <Textarea
            label="Описание для всех точек"
            name="batch-description"
            rows={4}
            required
            minLength={8}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <CategoryPicker value={category} onChange={setCategory} />
          <ul className="space-y-4">
            {stops.map((stop, index) => (
              <li
                key={index}
                className={`border p-4 ${selected === index ? "border-primary" : "border-border"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Точка {index + 1}
                    {selected === index ? " · на карте" : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant={selected === index ? "accent" : "ghost"} onClick={() => setSelected(index)}>
                      Ставить на карте
                    </Button>
                    {stops.length > 2 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          const next = stops.filter((_, row) => row !== index);
                          setStops(next);
                          setSelected(Math.min(selected, next.length - 1));
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                        Убрать
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Input
                    label="Заголовок"
                    name={`title-${index}`}
                    required
                    minLength={3}
                    value={stop.title}
                    onChange={(event) => patchStop(index, { title: event.target.value })}
                  />
                  <Input
                    label="Адрес"
                    name={`address-${index}`}
                    value={stop.address}
                    onChange={(event) => patchStop(index, { address: event.target.value })}
                  />
                  <Input
                    label="Сумма, BYN"
                    name={`price-${index}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={stop.price}
                    onChange={(event) => patchStop(index, { price: event.target.value })}
                  />
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <Input
                    label="Широта"
                    name={`lat-${index}`}
                    type="number"
                    required
                    step="0.00001"
                    value={stop.latitude}
                    onChange={(event) => patchStop(index, { latitude: Number(event.target.value) })}
                  />
                  <Input
                    label="Долгота"
                    name={`lng-${index}`}
                    type="number"
                    required
                    step="0.00001"
                    value={stop.longitude}
                    onChange={(event) => patchStop(index, { longitude: Number(event.target.value) })}
                  />
                  <div className="flex flex-col justify-end">
                    <Button type="button" variant="ghost" onClick={() => locate(index)}>
                      Моё место
                    </Button>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Точка: {formatPoint(stop.latitude, stop.longitude)}</p>
              </li>
            ))}
          </ul>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Карта пакета
            </p>
            <PointPicker
              value={{ latitude: active.latitude, longitude: active.longitude }}
              selectedId={String(selected)}
              markers={stops.map((stop, index) => ({
                id: String(index),
                label: stop.title.trim() || `Точка ${index + 1}`,
                latitude: stop.latitude,
                longitude: stop.longitude,
              }))}
              onPick={(point) => patchStop(selected, point)}
            />
          </div>
          {stops.length < 8 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStops([...stops, emptyStop()]);
                setSelected(stops.length);
              }}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Ещё точку
            </Button>
          ) : null}
          {error || geoError ? (
            <p className="text-sm text-destructive" role="alert">
              {geoError ?? error}
            </p>
          ) : null}
          <Button type="submit" variant="accent" disabled={batch.isPending}>
            {batch.isPending ? "Создаём…" : "Создать пакет"}
          </Button>
        </form>
        {created && created.length > 0 ? (
          <div className="mt-8 border border-border p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Созданные заявки</p>
            <ul className="mt-3 space-y-2">
              {created.map((row) => (
                <li key={row.id}>
                  <Link to={`/requests/${row.id}`} className="font-medium hover:text-primary">
                    {row.title}
                  </Link>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {formatPoint(row.latitude, row.longitude)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <h2 className="mt-16 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Мои заявки</h2>
        <div className="mt-6">
          <AdminSearch
            label="Поиск своих заявок"
            name="business-q"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setOffset(0);
            }}
            placeholder="Название, адрес"
          />
        </div>
        <AdminTable
          columns={["Заявка", "Адрес", "Статус", "Сумма"]}
          loading={list.isLoading}
          empty={!list.isLoading && (page?.items.length ?? 0) === 0 ? "Заявок нет." : undefined}
          minWidth="640px"
        >
          {(page?.items ?? []).map((row) => (
            <tr key={row.id} className="border-t border-border">
              <td className="px-4 py-4 font-medium">
                <Link to={`/requests/${row.id}`} className="hover:text-primary">
                  {row.title}
                </Link>
              </td>
              <td className="px-4 py-4 text-muted-foreground">{row.address_text ?? "—"}</td>
              <td className="px-4 py-4">
                <StatusChip value={row.status} />
              </td>
              <td className="px-4 py-4">{row.price ? `${row.price} BYN` : "Дарма"}</td>
            </tr>
          ))}
        </AdminTable>
        <AdminPager total={page?.total ?? 0} limit={page?.limit ?? 25} offset={offset} onOffset={setOffset} />
      </Page>
    </Section>
  );
}
