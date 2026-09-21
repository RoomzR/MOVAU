import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { adminCancelRequest, adminListRequests } from "../../api/admin";
import { ApiError } from "../../api/client";
import { AdminFilterChip } from "../../components/admin/AdminFilterChip";
import { AdminPager } from "../../components/admin/AdminPager";
import { AdminSearch } from "../../components/admin/AdminSearch";
import { AdminTable } from "../../components/admin/AdminTable";
import { Page } from "../../components/layout/Page";
import { Section } from "../../components/layout/Section";
import { Button } from "../../components/ui/Button";
import { CategoryChip, StatusChip } from "../../components/ui/CategoryChip";
import { useDebouncedValue } from "../../lib/useDebounced";
import type { HelpRequestStatus } from "../../types";

const CANCELABLE: HelpRequestStatus[] = ["open", "assigned", "in_progress"];
const STATUSES: { id: HelpRequestStatus | ""; label: string }[] = [
  { id: "", label: "Все" },
  { id: "open", label: "Открыта" },
  { id: "assigned", label: "Назначена" },
  { id: "in_progress", label: "В работе" },
  { id: "completed", label: "Выполнена" },
  { id: "cancelled", label: "Отменена" },
];

export function AdminRequestsPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<HelpRequestStatus | "">("");
  const [offset, setOffset] = useState(0);
  const search = useDebouncedValue(q);
  const query = useQuery({
    queryKey: ["admin", "requests", search, status, offset],
    queryFn: () => adminListRequests({ q: search, status: status || undefined, offset }),
  });
  const cancel = useMutation({
    mutationFn: (id: string) => adminCancelRequest(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      await queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
  });
  const page = query.data;
  const error =
    query.error instanceof ApiError || query.error instanceof Error
      ? query.error.message
      : cancel.error instanceof ApiError || cancel.error instanceof Error
        ? cancel.error.message
        : null;

  return (
    <Section className="py-10 md:py-14">
      <Page>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Модерация</p>
        <h1 className="mt-2 font-display text-4xl uppercase leading-[1.05] tracking-tight md:text-6xl">Заявки</h1>
        <div className="mt-8 flex flex-col gap-3">
          <AdminSearch
            label="Поиск заявок"
            name="requests-q"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setOffset(0);
            }}
            placeholder="Название, email, id"
          />
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((row) => (
              <AdminFilterChip
                key={row.id || "all"}
                label={row.label}
                active={status === row.id}
                onClick={() => {
                  setStatus(row.id);
                  setOffset(0);
                }}
              />
            ))}
          </div>
        </div>
        <AdminTable
          columns={["Заявка", "Автор", "Категория", "Статус", "Оплата", ""]}
          loading={query.isLoading}
          error={error}
          empty={!query.isLoading && (page?.items.length ?? 0) === 0 ? "Заявок нет." : undefined}
          minWidth="800px"
        >
          {(page?.items ?? []).map((row) => (
            <tr key={row.id} className="border-t border-border">
              <td className="px-4 py-4 font-medium">
                <Link to={`/requests/${row.id}`} className="hover:text-primary">
                  {row.title}
                </Link>
              </td>
              <td className="px-4 py-4 text-muted-foreground">{row.client_display_name}</td>
              <td className="px-4 py-4">
                <CategoryChip value={row.category} />
              </td>
              <td className="px-4 py-4">
                <StatusChip value={row.status} />
              </td>
              <td className="px-4 py-4">{row.price ? `${row.price} BYN` : "Дарма"}</td>
              <td className="px-4 py-4 text-right">
                {CANCELABLE.includes(row.status) ? (
                  <Button
                    variant="ghost"
                    className="text-destructive"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate(row.id)}
                  >
                    <Ban className="mr-2 h-4 w-4" aria-hidden="true" />
                    Отменить
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </AdminTable>
        <AdminPager total={page?.total ?? 0} limit={page?.limit ?? 25} offset={offset} onOffset={setOffset} />
      </Page>
    </Section>
  );
}
