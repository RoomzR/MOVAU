import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";

import { listNotifications, readNotification } from "../api/notifications";
import { Page } from "../components/layout/Page";
import { Section } from "../components/layout/Section";
import { goToNotification } from "../lib/inbox";
import { notificationKindLabel } from "../lib/labels";
import { ScrollPane } from "../components/ui/ScrollPane";
import { useAuthStore } from "../store/authStore";

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString("ru-BY", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InboxPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
    enabled: Boolean(user),
  });
  const readOne = useMutation({
    mutationFn: readNotification,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  if (!user) {
    return <Navigate to="/login?next=/inbox" replace />;
  }

  const items = query.data?.items ?? [];

  return (
    <Section className="py-12">
      <Page>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Кабинет</p>
        <h1 className="mt-2 font-display text-5xl uppercase leading-[1.05] tracking-tight md:text-6xl">Уведомления</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">Нажмите строку — откроется заявка или нужная страница.</p>
        {query.isLoading ? <p className="mt-10 text-muted-foreground">Загружаем…</p> : null}
        {!query.isLoading && items.length === 0 ? (
          <p className="mt-10 text-muted-foreground">Пока тихо.</p>
        ) : null}
        {items.length > 0 ? (
          <ScrollPane label="Уведомления" className="mt-10 max-h-[min(50svh,24rem)]">
            <ul className="divide-y divide-border border-y border-border">
              {items.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="flex min-h-11 w-full cursor-pointer items-start gap-3 py-5 text-left hover:text-primary"
                    onClick={() => goToNotification(navigate, row, (id) => readOne.mutate(id))}
                  >
                    <span
                      className={`mt-2 h-2 w-2 shrink-0 rounded-full ${row.read_at ? "bg-zinc-700" : "bg-primary"}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {notificationKindLabel(row.kind)} · {formatWhen(row.created_at)}
                      </span>
                      <span className="mt-2 block font-display text-2xl uppercase leading-tight">{row.title}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">{row.body}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollPane>
        ) : null}
      </Page>
    </Section>
  );
}
