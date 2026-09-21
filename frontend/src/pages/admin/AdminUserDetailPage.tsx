import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import {
  adminActivateUser,
  adminDeactivateUser,
  adminGetUser,
  adminGrantRole,
  adminRevokeRole,
} from "../../api/admin";
import { ApiError } from "../../api/client";
import { Page } from "../../components/layout/Page";
import { Section } from "../../components/layout/Section";
import { Button } from "../../components/ui/Button";
import { RoleChip } from "../../components/ui/RoleChip";
import { StatusChip } from "../../components/ui/CategoryChip";
import { StatGrid, StatTile } from "../../components/ui/StatTile";
import { identityStatusLabel, roleLabel } from "../../lib/labels";
import { canAssignRole, GRANTABLE } from "../../lib/staffRoles";
import { useAuthStore } from "../../store/authStore";
import type { UserRole } from "../../types";

export function AdminUserDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const me = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin", "users", id],
    queryFn: () => adminGetUser(id!),
    enabled: Boolean(id),
  });
  const deactivate = useMutation({
    mutationFn: () => adminDeactivateUser(id!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  const activate = useMutation({
    mutationFn: () => adminActivateUser(id!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  const grant = useMutation({
    mutationFn: (role: UserRole) => adminGrantRole(id!, role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  const revoke = useMutation({
    mutationFn: (role: UserRole) => adminRevokeRole(id!, role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  const person = query.data;
  const actionError = deactivate.error ?? activate.error ?? grant.error ?? revoke.error;
  const isSelf = Boolean(person && person.id === me?.id);
  const targetIsAdmin = Boolean(person?.roles.includes("admin"));
  const staffCanTouch = Boolean(me?.roles.includes("admin") || (me?.roles.includes("moderator") && !targetIsAdmin));

  useEffect(() => {
    if (!person || location.hash !== "#roles") {
      return;
    }
    document.getElementById("roles")?.scrollIntoView({ block: "start" });
  }, [person, location.hash]);

  return (
    <Section className="py-10 md:py-14">
      <Page>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Модерация</p>
        <p className="mt-4">
          <Link to="/admin/users" className="text-sm font-semibold text-primary">
            К списку
          </Link>
        </p>
        {query.isLoading ? <p className="mt-8 text-sm text-muted-foreground">Загружаем…</p> : null}
        {query.isError || (!query.isLoading && !person) ? (
          <p className="mt-8 text-sm text-destructive">Человек не найден.</p>
        ) : null}
        {person ? (
          <>
            <h1 className="mt-2 font-display text-4xl uppercase leading-[1.05] tracking-tight md:text-6xl">
              {person.display_name}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">{person.email}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {person.roles.map((role) => (
                <RoleChip key={role} role={role} />
              ))}
            </div>
            <StatGrid>
              <StatTile label="Личность">{identityStatusLabel(person.identity_status)}</StatTile>
              <StatTile label="Телефон" className="sm:border-r-0">
                {person.phone_verified && person.phone ? person.phone : "Не подтверждён"}
              </StatTile>
              <StatTile label="Заявки" className="sm:border-b-0">
                {person.requests_total}
              </StatTile>
              <StatTile label="Статус" className="border-b-0 sm:border-r-0">
                {person.is_active ? "Активен" : "Отключён"}
              </StatTile>
            </StatGrid>
            {person.id !== me?.id ? (
              <div className="mt-8">
                {person.is_active ? (
                  <Button
                    variant="ghost"
                    className="text-destructive"
                    disabled={deactivate.isPending}
                    onClick={() => deactivate.mutate()}
                  >
                    <ShieldOff className="mr-2 h-4 w-4" aria-hidden="true" />
                    Отключить
                  </Button>
                ) : (
                  <Button variant="ghost" disabled={activate.isPending} onClick={() => activate.mutate()}>
                    <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                    Включить
                  </Button>
                )}
              </div>
            ) : null}
            <div className="mt-10" id="roles">
              <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Роли</h2>
              {isSelf ? (
                <p className="mt-4 text-sm text-muted-foreground">Нельзя менять свои роли.</p>
              ) : targetIsAdmin ? (
                <p className="mt-4 text-sm text-muted-foreground">Роли admin через API не выдаются и не снимаются.</p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Модератор выдаёт исполнителя и волонтёра. Business / moderator / analyst — только admin.
                </p>
              )}
              <ul className="mt-4 divide-y divide-border border border-border">
                {GRANTABLE.map((role) => {
                  const has = person.roles.includes(role);
                  const editable = !isSelf && staffCanTouch && canAssignRole(me?.roles, role);
                  return (
                    <li key={role} className="flex min-h-11 items-center justify-between gap-4 px-4 py-3">
                      <span className="text-sm font-medium">{roleLabel(role)}</span>
                      {editable ? (
                        has ? (
                          <Button
                            variant="ghost"
                            className="text-destructive"
                            disabled={revoke.isPending}
                            onClick={() => revoke.mutate(role)}
                          >
                            Снять
                          </Button>
                        ) : (
                          <Button variant="accent" disabled={grant.isPending} onClick={() => grant.mutate(role)}>
                            Выдать
                          </Button>
                        )
                      ) : (
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {isSelf ? "Свои роли" : targetIsAdmin ? "Admin" : has ? "Есть" : "Только admin"}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            {actionError instanceof ApiError || actionError instanceof Error ? (
              <p className="mt-4 text-sm text-destructive" role="alert">
                {actionError.message}
              </p>
            ) : null}
            <h2 className="mt-12 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Заявки</h2>
            {person.requests.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Заявок нет.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border border border-border">
                {person.requests.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-4 px-4 py-4">
                    <Link to={`/requests/${row.id}`} className="font-medium hover:text-primary">
                      {row.title}
                    </Link>
                    <StatusChip value={row.status} />
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </Page>
    </Section>
  );
}
