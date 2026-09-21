import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { adminListIdentity } from "../../api/identity";
import { AdminFilterChip } from "../../components/admin/AdminFilterChip";
import { AdminPager } from "../../components/admin/AdminPager";
import { AdminSearch } from "../../components/admin/AdminSearch";
import { IdentityQueue } from "../../components/identity/IdentityQueue";
import { Page } from "../../components/layout/Page";
import { Section } from "../../components/layout/Section";
import { useDebouncedValue } from "../../lib/useDebounced";
import type { IdentityStatus } from "../../types";

const STATUSES: { id: IdentityStatus; label: string }[] = [
  { id: "pending", label: "Очередь" },
  { id: "verified", label: "Одобрены" },
  { id: "rejected", label: "Отказ" },
];

export function AdminIdentityPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<IdentityStatus>("pending");
  const [offset, setOffset] = useState(0);
  const search = useDebouncedValue(q);
  const query = useQuery({
    queryKey: ["admin", "identity", status, search, offset],
    queryFn: () => adminListIdentity({ status, q: search, offset }),
  });
  const page = query.data;

  return (
    <Section className="py-10 md:py-14">
      <Page>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Модерация</p>
        <h1 className="mt-2 font-display text-4xl uppercase leading-[1.05] tracking-tight md:text-6xl">Личность</h1>
        <p className="mt-3 text-sm text-muted-foreground">Сверьте селфи с фото в документе. Автоматики нет.</p>
        <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
          <AdminSearch
            label="Поиск по имени или email"
            name="identity-q"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setOffset(0);
            }}
            placeholder="Имя, email"
          />
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((row) => (
              <AdminFilterChip
                key={row.id}
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
        <IdentityQueue items={page?.items ?? []} loading={query.isLoading} />
        <AdminPager
          total={page?.total ?? 0}
          limit={page?.limit ?? 25}
          offset={offset}
          onOffset={setOffset}
        />
      </Page>
    </Section>
  );
}
