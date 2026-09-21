import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { ApiError } from "../../api/client";
import { adminListDisputes, adminResolveDispute } from "../../api/disputes";
import { AdminFilterChip } from "../../components/admin/AdminFilterChip";
import { AdminPager } from "../../components/admin/AdminPager";
import { AdminSearch } from "../../components/admin/AdminSearch";
import { AdminTable } from "../../components/admin/AdminTable";
import { Page } from "../../components/layout/Page";
import { Section } from "../../components/layout/Section";
import { Button } from "../../components/ui/Button";
import { Textarea } from "../../components/ui/Textarea";
import { disputeLabel } from "../../lib/labels";
import { useDebouncedValue } from "../../lib/useDebounced";

export function AdminDisputesPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"open" | "resolved" | "">("open");
  const [offset, setOffset] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const search = useDebouncedValue(q);
  const query = useQuery({
    queryKey: ["admin", "disputes", search, status, offset],
    queryFn: () => adminListDisputes({ q: search, status: status || undefined, offset }),
  });
  const resolve = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => adminResolveDispute(id, text),
    onSuccess: async () => {
      setOpenId(null);
      setResolution("");
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  const page = query.data;
  const error =
    query.error instanceof ApiError || query.error instanceof Error
      ? query.error.message
      : resolve.error instanceof ApiError || resolve.error instanceof Error
        ? resolve.error.message
        : null;

  return (
    <Section className="py-10 md:py-14">
      <Page>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Модерация</p>
        <h1 className="mt-2 font-display text-4xl uppercase leading-[1.05] tracking-tight md:text-6xl">Споры</h1>
        <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
          <AdminSearch
            label="Поиск споров"
            name="disputes-q"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setOffset(0);
            }}
            placeholder="Причина, автор, id"
          />
          <div className="flex flex-wrap gap-2">
            <AdminFilterChip
              label="Открытые"
              active={status === "open"}
              onClick={() => {
                setStatus("open");
                setOffset(0);
              }}
            />
            <AdminFilterChip
              label="Закрытые"
              active={status === "resolved"}
              onClick={() => {
                setStatus("resolved");
                setOffset(0);
              }}
            />
            <AdminFilterChip
              label="Все"
              active={status === ""}
              onClick={() => {
                setStatus("");
                setOffset(0);
              }}
            />
          </div>
        </div>
        <AdminTable
          columns={["Автор", "Причина", "Статус", ""]}
          loading={query.isLoading}
          error={error}
          empty={!query.isLoading && (page?.items.length ?? 0) === 0 ? "Споров нет." : undefined}
        >
          {(page?.items ?? []).map((row) => (
            <tr key={row.id} className="border-t border-border">
              <td className="px-4 py-4 font-medium">{row.author_display_name}</td>
              <td className="px-4 py-4">
                <p>{row.reason}</p>
                <Link to={`/requests/${row.help_request_id}`} className="mt-2 inline-block text-sm text-primary">
                  Заявка
                </Link>
                {openId === row.id ? (
                  <form
                    className="mt-4 space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      resolve.mutate({ id: row.id, text: resolution });
                    }}
                  >
                    <Textarea
                      label="Решение"
                      name={`resolution-${row.id}`}
                      rows={3}
                      value={resolution}
                      onChange={(event) => setResolution(event.target.value)}
                      required
                      minLength={3}
                      maxLength={500}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" variant="accent" disabled={resolve.isPending}>
                        Закрыть спор
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setOpenId(null)}>
                        Отмена
                      </Button>
                    </div>
                  </form>
                ) : null}
              </td>
              <td className="px-4 py-4">{disputeLabel(row.status)}</td>
              <td className="px-4 py-4 text-right">
                {row.status === "open" && openId !== row.id ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setOpenId(row.id);
                      setResolution("");
                    }}
                  >
                    Закрыть
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
