import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";

import { ApiError } from "../api/client";
import { addMyRole, removeMyRole, updateMyProfile } from "../api/users";
import { IdentityBadge } from "../components/identity/IdentityBadge";
import { Page } from "../components/layout/Page";
import { Section } from "../components/layout/Section";
import { PhoneVerify } from "../components/profile/PhoneVerify";
import { ProgressRings } from "../components/profile/ProgressRings";
import { WalletPanel } from "../components/profile/WalletPanel";
import { AvatarMark } from "../components/ui/AvatarMark";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { RoleChip } from "../components/ui/RoleChip";
import { SkillChips } from "../components/ui/SkillChips";
import { StatGrid, StatTile } from "../components/ui/StatTile";
import { Textarea } from "../components/ui/Textarea";
import { clientLevelLabel } from "../lib/labels";
import { useAuthStore } from "../store/authStore";
import { useShiftStore } from "../store/shiftStore";
import type { UserRole } from "../types";

export function ProfileMePage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const stopShift = useShiftStore((state) => state.stop);
  const onShift = useShiftStore((state) => state.onShift);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [rolePending, setRolePending] = useState<UserRole | null>(null);
  const [skills, setSkills] = useState(user?.skills ?? "");

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const next = await updateMyProfile({
        display_name: String(form.get("display_name")),
        bio: String(form.get("bio") || "") || null,
        skills: skills || null,
      });
      setUser(next);
      setSkills(next.skills ?? "");
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить профиль");
    } finally {
      setPending(false);
    }
  }

  async function toggleRole(role: UserRole, enabled: boolean) {
    setRolePending(role);
    setError(null);
    try {
      if (!enabled && role === "executor" && onShift) {
        await stopShift();
      }
      const next = enabled ? await addMyRole(role) : await removeMyRole(role);
      setUser(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сменить роль");
    } finally {
      setRolePending(null);
    }
  }

  return (
    <Section className="py-12 md:py-16">
      <Page narrow>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Профиль</p>
        <div className="mt-4 flex items-start gap-4">
          <AvatarMark name={user.display_name} size="lg" />
          <div className="min-w-0">
            <h1 className="font-display text-4xl uppercase leading-[1.05] tracking-tight md:text-6xl">{user.display_name}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              <Link className="font-semibold text-primary" to={`/users/${user.id}`}>
                Как меня видят другие
              </Link>
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {user.identity_status === "verified" ? <IdentityBadge /> : null}
          {user.roles.map((role) => (
            <RoleChip key={role} role={role} />
          ))}
        </div>
        {user.identity_status !== "verified" ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {user.identity_status === "pending"
              ? "Паспорт на проверке. Заявки откроются после подтверждения."
              : "Заявки, в том числе дарма, — после проверки паспорта."}{" "}
            <Link className="font-semibold text-primary" to="/me/verify">
              {user.identity_status === "pending" ? "Статус проверки" : "Подтвердить личность"}
            </Link>
          </p>
        ) : null}

        <ProgressRings
          identityStatus={user.identity_status}
          karmaPoints={user.karma_points ?? 0}
          ratingAvg={user.rating_avg}
        />

        <StatGrid>
          <StatTile label="Уровень">{clientLevelLabel(user.client_level)}</StatTile>
          <StatTile label="Оценок" className="sm:border-r-0">
            {user.rating_count ?? 0}
          </StatTile>
          <StatTile label="Выполнено" className="border-b-0 sm:col-span-2 sm:border-r-0">
            {user.completed_as_client ?? 0}
          </StatTile>
        </StatGrid>

        <form className="mt-10 space-y-6" onSubmit={onSubmit}>
          <Input label="Имя" name="display_name" defaultValue={user.display_name} required minLength={2} />
          <Textarea label="О себе" name="bio" rows={4} maxLength={280} defaultValue={user.bio ?? ""} />
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Навыки</p>
            <SkillChips value={skills} onChange={setSkills} />
          </div>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          {saved ? <p className="text-sm text-primary">Сохранено.</p> : null}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="accent" disabled={pending} className="w-full" size="lg">
            {pending ? "Сохраняем…" : "Сохранить"}
          </Button>
        </form>

        <PhoneVerify />
        <WalletPanel />

        <div className="mt-12 space-y-2 border-t border-border pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Роли</p>
          <RoleToggle
            title="Исполнитель"
            hint="Платные заявки и смена на карте."
            checked={user.roles.includes("executor")}
            disabled={rolePending === "executor"}
            onChange={(enabled) => void toggleRole("executor", enabled)}
          />
          <RoleToggle
            title="Волонтёр"
            hint="Только дарма. Карма копится."
            checked={user.roles.includes("volunteer")}
            disabled={rolePending === "volunteer"}
            onChange={(enabled) => void toggleRole("volunteer", enabled)}
          />
          <RoleToggle
            title="Бизнес"
            hint="Пакеты заявок и кабинет партнёра."
            checked={user.roles.includes("business")}
            disabled={rolePending === "business"}
            onChange={(enabled) => void toggleRole("business", enabled)}
          />
          <p className="pt-2 text-sm text-muted-foreground">Клиент остаётся всегда. Смена гаснет, если снять исполнителя.</p>
        </div>
      </Page>
    </Section>
  );
}

function RoleToggle({
  title,
  hint,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 border-b border-border py-4">
      <span>
        <span className="block font-medium">{title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{hint}</span>
      </span>
      <input
        type="checkbox"
        className="h-5 w-5 shrink-0 accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
