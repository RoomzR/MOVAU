import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldOff, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { adminActivateUser, adminDeactivateUser, adminGrantRole, adminListUsers, adminRevokeRole } from "../../api/admin";
import { ApiError } from "../../api/client";
import { AdminFilterChip } from "../../components/admin/AdminFilterChip";
import { AdminPager } from "../../components/admin/AdminPager";
import { AdminSearch } from "../../components/admin/AdminSearch";
import { AdminTable } from "../../components/admin/AdminTable";
import { Page } from "../../components/layout/Page";
import { Section } from "../../components/layout/Section";
import { Button } from "../../components/ui/Button";
import { RoleChip } from "../../components/ui/RoleChip";
import { actorRoleLabel, canAssignRole, LIST_GRANTABLE } from "../../lib/staffRoles";
import { useDebouncedValue } from "../../lib/useDebounced";
import { useAuthStore } from "../../store/authStore";
import type { AdminUser, UserRole } from "../../types";

const ROLE_FILTERS: { id: "all" | UserRole; label: string }[] = [
  { id: "all", label: "Все роли" },
  { id: "executor", label: "Исполнитель" },
  { id: "volunteer", label: "Волонтёр" },
  { id: "business", label: "Бизнес" },
  { id: "moderator", label: "Модератор" },
  { id: "analyst", label: "Аналитик" },
  { id: "admin", label: "Admin" },
];

export function AdminUsersPage() {
  const me = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [active, setActive] = useState<"all" | "yes" | "no">("all");
  const [role, setRole] = useState<"all" | UserRole>("all");
  const [offset, setOffset] = useState(0);
  const search = useDebouncedValue(q);
  const query = useQuery({
    queryKey: ["admin", "users", search, active, role, offset],
    queryFn: () =>
      adminListUsers({
        q: search,
        is_active: active === "all" ? undefined : active === "yes",
        role: role === "all" ? undefined : role,
        offset,
      }),
  });
  const deactivate = useMutation({
    mutationFn: adminDeactivateUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  const activate = useMutation({
    mutationFn: adminActivateUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  const grant = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => adminGrantRole(id, role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  const revoke = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => adminRevokeRole(id, role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  const page = query.data;
  const actionError = deactivate.error ?? activate.error ?? grant.error ?? revoke.error;
  const error =
    query.error instanceof ApiError || query.error instanceof Error
      ? query.error.message
      : actionError instanceof ApiError || actionError instanceof Error
        ? actionError.message
        : null;
  const busy = deactivate.isPending || activate.isPending || grant.isPending || revoke.isPending;

  return (
    <Section className="py-10 md:py-14">
      <Page>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Модерация</p>
        <h1 className="mt-2 font-display text-4xl uppercase leading-[1.05] tracking-tight md:text-6xl">Люди</h1>
        <p className="mt-4 border border-border bg-card px-4 py-3 text-sm">
          Вы вошли как {actorRoleLabel(me?.roles)}. Исполнителя и волонтёра выдаёте в строке. Аналитика / модератор /
          бизнес — admin@movau.test.
        </p>
        <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
          <AdminSearch
            label="Поиск людей"
            name="users-q"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setOffset(0);
            }}
            placeholder="Email, имя, телефон"
          />
          <div className="flex flex-wrap gap-2">
            <AdminFilterChip
              label="Все"
              active={active === "all"}
              onClick={() => {
                setActive("all");
                setOffset(0);
              }}
            />
            <AdminFilterChip
              label="Активны"
              active={active === "yes"}
              onClick={() => {
                setActive("yes");
                setOffset(0);
              }}
            />
            <AdminFilterChip
              label="Отключены"
              active={active === "no"}
              onClick={() => {
                setActive("no");
                setOffset(0);
              }}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Роль">
          {ROLE_FILTERS.map((row) => (
            <AdminFilterChip
              key={row.id}
              label={row.label}
              active={role === row.id}
              onClick={() => {
                setRole(row.id);
                setOffset(0);
              }}
            />
          ))}
        </div>
        <AdminTable
          columns={["Имя", "Email", "Роли", "Статус", ""]}
          loading={query.isLoading}
          error={error}
          empty={!query.isLoading && (page?.items.length ?? 0) === 0 ? "Никого не нашли." : undefined}
          minWidth="960px"
        >
          {(page?.items ?? []).map((row) => (
            <tr key={row.id} className="border-t border-border">
              <td className="px-4 py-4 font-medium">
                <Link to={`/admin/users/${row.id}`} className="hover:text-primary">
                  {row.display_name}
                </Link>
              </td>
              <td className="px-4 py-4">{row.email}</td>
              <td className="px-4 py-4">
                <span className="flex flex-wrap gap-1">
                  {row.roles.map((item) => (
                    <RoleChip key={item} role={item} />
                  ))}
                </span>
              </td>
              <td className="px-4 py-4">{row.is_active ? "Активен" : "Отключён"}</td>
              <td className="px-4 py-4">
                <RowActions
                  row={row}
                  meId={me?.id}
                  meRoles={me?.roles}
                  busy={busy}
                  onGrant={(role) => grant.mutate({ id: row.id, role })}
                  onRevoke={(role) => revoke.mutate({ id: row.id, role })}
                  onDeactivate={() => deactivate.mutate(row.id)}
                  onActivate={() => activate.mutate(row.id)}
                />
              </td>
            </tr>
          ))}
        </AdminTable>
        <AdminPager total={page?.total ?? 0} limit={page?.limit ?? 25} offset={offset} onOffset={setOffset} />
      </Page>
    </Section>
  );
}

function RowActions({
  row,
  meId,
  meRoles,
  busy,
  onGrant,
  onRevoke,
  onDeactivate,
  onActivate,
}: {
  row: AdminUser;
  meId?: string;
  meRoles?: string[];
  busy: boolean;
  onGrant: (role: UserRole) => void;
  onRevoke: (role: UserRole) => void;
  onDeactivate: () => void;
  onActivate: () => void;
}) {
  const isSelf = row.id === meId;
  const targetIsAdmin = row.roles.includes("admin");
  const showRoles = !isSelf && !targetIsAdmin;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {showRoles
        ? LIST_GRANTABLE.map((role) => {
            if (!canAssignRole(meRoles, role)) {
              return null;
            }
            const has = row.roles.includes(role);
            const grantLabel = role === "executor" ? "Выдать исполнителя" : "Выдать волонтёра";
            const revokeLabel = role === "executor" ? "Снять исполнителя" : "Снять волонтёра";
            return has ? (
              <Button
                key={role}
                variant="ghost"
                className="text-destructive"
                disabled={busy}
                onClick={() => onRevoke(role)}
              >
                {revokeLabel}
              </Button>
            ) : (
              <Button key={role} variant="accent" disabled={busy} onClick={() => onGrant(role)}>
                {grantLabel}
              </Button>
            );
          })
        : null}
      {isSelf ? <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Это вы</span> : null}
      {!isSelf ? (
        <Link to={`/admin/users/${row.id}#roles`} className="text-sm font-semibold text-primary">
          Ещё роли
        </Link>
      ) : null}
      {isSelf ? null : row.is_active ? (
        <Button variant="ghost" className="text-destructive" disabled={busy} onClick={onDeactivate}>
          <ShieldOff className="mr-2 h-4 w-4" aria-hidden="true" />
          Отключить
        </Button>
      ) : (
        <Button variant="ghost" disabled={busy} onClick={onActivate}>
          <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
          Включить
        </Button>
      )}
    </div>
  );
}
