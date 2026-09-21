import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { adminOverview } from "../../api/admin";
import { Page } from "../../components/layout/Page";
import { Section } from "../../components/layout/Section";

export function AdminOverviewPage() {
  const query = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: adminOverview,
  });
  const data = query.data;

  return (
    <Section className="py-10 md:py-14">
      <Page>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Модерация</p>
        <h1 className="mt-2 font-display text-4xl uppercase leading-[1.05] tracking-tight md:text-6xl">Обзор</h1>
        {query.isLoading ? <p className="mt-8 text-sm text-muted-foreground">Загружаем…</p> : null}
        <div className="mt-10 grid border-t border-border sm:grid-cols-2">
          <QueueLink to="/admin/identity" label="Личность" value={data?.pending_identity ?? 0} />
          <QueueLink to="/admin/disputes" label="Открытые споры" value={data?.open_disputes ?? 0} edge />
          <QueueLink to="/admin/requests" label="Открытые заявки" value={data?.open_requests ?? 0} />
          <QueueLink to="/admin/requests" label="В работе" value={data?.in_progress_requests ?? 0} edge />
          <QueueLink to="/admin/users" label="Люди" value={data?.users_total ?? 0} last />
          <QueueLink to="/admin/users" label="Отключены" value={data?.users_inactive ?? 0} edge last />
        </div>
      </Page>
    </Section>
  );
}

function QueueLink({
  to,
  label,
  value,
  edge = false,
  last = false,
}: {
  to: string;
  label: string;
  value: number;
  edge?: boolean;
  last?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`p-6 hover:bg-white/5 ${last ? "border-b-0" : "border-b"} border-border ${edge ? "sm:border-r-0" : "sm:border-r"} ${last ? "sm:border-b-0" : ""}`}
    >
      <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <span className="mt-3 block font-display text-2xl leading-snug">{value}</span>
    </Link>
  );
}
