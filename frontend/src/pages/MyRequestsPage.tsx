import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, RotateCcw, Star } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { ApiError } from "../api/client";
import { listRequests, repeatRequest } from "../api/requests";
import { Page } from "../components/layout/Page";
import { Section } from "../components/layout/Section";
import { Button } from "../components/ui/Button";
import { CategoryChip, StatusChip } from "../components/ui/CategoryChip";
import { ScrollPane } from "../components/ui/ScrollPane";
import { useAuthStore } from "../store/authStore";

const ACTIVE = new Set(["open", "assigned", "in_progress"]);

export function MyRequestsPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [repeatId, setRepeatId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["requests", "mine"],
    queryFn: () => listRequests({ mine: true }),
    enabled: Boolean(user),
  });
  const repeat = useMutation({
    mutationFn: (id: string) => repeatRequest(id),
    onSuccess: async (next) => {
      await queryClient.invalidateQueries({ queryKey: ["requests", "mine"] });
      navigate(`/requests/${next.id}`);
    },
  });
  const repeatError =
    repeat.error instanceof ApiError || repeat.error instanceof Error ? repeat.error.message : null;

  if (!user) {
    return <Navigate to="/login?next=/requests/mine" replace />;
  }

  const rows = query.data ?? [];
  const active = rows.filter((row) => ACTIVE.has(row.status));
  const rest = rows.filter((row) => !ACTIVE.has(row.status));
  const ordered = [...active, ...rest];

  return (
    <Section className="py-12">
      <Page>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Кабинет</p>
        <h1 className="mt-2 font-display text-5xl uppercase leading-[1.05] tracking-tight md:text-6xl">В работе</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Ваши заявки и те, что вы взяли. Чат открывается сразу после «Возьмусь». Повтор — копия на той же
          точке; людям на смене уйдёт колокол.
        </p>
        {query.isLoading ? <p className="mt-10 text-muted-foreground">Загружаем заявки…</p> : null}
        {query.isError ? (
          <p className="mt-10 text-destructive" role="alert">
            Не удалось загрузить заявки.
          </p>
        ) : null}
        {!query.isLoading && ordered.length === 0 ? (
          <p className="mt-10 text-muted-foreground">Пока пусто. Возьмите точку на карте или создайте заявку.</p>
        ) : null}
        {ordered.length > 0 ? (
          <ScrollPane label="Заявки в работе" className="mt-10 max-h-[min(50svh,24rem)]">
            <ul className="divide-y divide-border border-y border-border">
          {ordered.map((row) => {
            const mineTaken = row.executor_id === user.id;
            const mineCreated = row.client_id === user.id;
            const roleLine =
              mineTaken && mineCreated ? "Вы автор и исполнитель" : mineTaken ? "Вы взяли" : "Вы автор";
            return (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-4 py-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <CategoryChip value={row.category} />
                    <StatusChip value={row.status} />
                  </div>
                  <p className="mt-3 font-display text-2xl uppercase leading-tight">{row.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {roleLine}
                    {row.price ? ` · ${row.price} BYN` : " · Дарма"}
                  </p>
                </div>
                <div className="flex min-w-0 flex-col items-stretch gap-2 sm:items-end">
                  <div className="flex flex-wrap gap-2">
                    {row.status === "completed" && (mineCreated || mineTaken) ? (
                      <Link to={`/requests/${row.id}#review`}>
                        <Button variant="ghost">
                          <Star className="mr-2 h-4 w-4" aria-hidden="true" />
                          Оценить
                        </Button>
                      </Link>
                    ) : null}
                    {row.status === "completed" && mineCreated ? (
                      <Button
                        variant="ghost"
                        disabled={repeat.isPending}
                        onClick={() => {
                          setRepeatId(row.id);
                          repeat.mutate(row.id);
                        }}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                        {repeat.isPending && repeatId === row.id ? "Повторяем…" : "Повторить"}
                      </Button>
                    ) : null}
                    <Link to={row.status === "open" ? `/requests/${row.id}` : `/requests/${row.id}#chat`}>
                      <Button variant={row.status === "open" ? "ghost" : "accent"}>
                        <MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" />
                        {row.status === "open" ? "Открыть" : "Чат"}
                      </Button>
                    </Link>
                  </div>
                  {repeatError && repeatId === row.id ? (
                    <p className="max-w-xs text-sm text-destructive" role="alert">
                      {repeatError}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
            </ul>
          </ScrollPane>
        ) : null}
      </Page>
    </Section>
  );
}
