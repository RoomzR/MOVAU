import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { adminListEvents } from "../../api/admin";
import { ApiError } from "../../api/client";
import { AdminPager } from "../../components/admin/AdminPager";
import { AdminSearch } from "../../components/admin/AdminSearch";
import { AdminTable } from "../../components/admin/AdminTable";
import { Page } from "../../components/layout/Page";
import { Section } from "../../components/layout/Section";
import { adminEntityHref, adminEntityLabel, adminEventLabel } from "../../lib/labels";
import { useDebouncedValue } from "../../lib/useDebounced";

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString("ru-BY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function shortId(value: string) {
  return value.replaceAll("-", "").slice(0, 8);
}

export function AdminJournalPage() {
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const search = useDebouncedValue(q);
  const query = useQuery({
    queryKey: ["admin", "events", search, offset],
    queryFn: () => adminListEvents({ q: search, offset }),
  });
  const page = query.data;
  const error = query.error instanceof ApiError || query.error instanceof Error ? query.error.message : null;

  return (
    <Section className="py-10 md:py-14">
      <Page>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Модерация</p>
        <h1 className="mt-2 font-display text-4xl uppercase leading-[1.05] tracking-tight md:text-6xl">Журнал</h1>
        <p className="mt-4 text-sm text-muted-foreground">Аудит действий staff: кто, какое событие, какой объект.</p>
        <div className="mt-8">
          <AdminSearch
            label="Поиск по журналу"
            name="events-q"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setOffset(0);
            }}
            placeholder="email, имя, id"
          />
        </div>
        <AdminTable
          columns={["Время", "Кто", "Событие", "Объект", "Сообщение"]}
          loading={query.isLoading}
          error={error}
          empty={!query.isLoading && (page?.items.length ?? 0) === 0 ? "Пока пусто." : undefined}
          minWidth="1080px"
        >
          {(page?.items ?? []).map((row) => {
            const objectHref = adminEntityHref(row.entity_type, row.entity_id);
            return (
              <tr key={row.id} className="border-t border-border align-top">
                <td className="px-4 py-4 text-muted-foreground" title={row.created_at}>
                  {formatWhen(row.created_at)}
                </td>
                <td className="px-4 py-4">
                  <Link to={`/admin/users/${row.actor_id}`} className="font-medium hover:text-primary">
                    {row.actor_display_name}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">{row.actor_email}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{shortId(row.actor_id)}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-mono text-xs text-primary">{row.kind}</p>
                  <p className="mt-1 text-sm">{adminEventLabel(row.kind)}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-mono text-xs text-muted-foreground">{row.entity_type}</p>
                  <p className="mt-1 text-sm">{adminEntityLabel(row.entity_type)}</p>
                  {objectHref ? (
                    <Link to={objectHref} className="mt-1 inline-block font-mono text-xs text-primary hover:underline">
                      {shortId(row.entity_id)}
                    </Link>
                  ) : (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{shortId(row.entity_id)}</p>
                  )}
                </td>
                <td className="px-4 py-4 text-sm">{row.detail}</td>
              </tr>
            );
          })}
        </AdminTable>
        <AdminPager total={page?.total ?? 0} limit={page?.limit ?? 25} offset={offset} onOffset={setOffset} />
      </Page>
    </Section>
  );
}
