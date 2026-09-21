import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IdCard, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";

import { ApiError } from "../api/client";
import { getMyIdentity, submitIdentity } from "../api/identity";
import { fetchMyProfile } from "../api/users";
import { IdentityBlobPhoto } from "../components/identity/IdentityBlobPhoto";
import { PhotoCapture } from "../components/identity/PhotoCapture";
import { Page } from "../components/layout/Page";
import { Section } from "../components/layout/Section";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { DOCUMENT_KINDS, identityStatusLabel } from "../lib/labels";
import { useAuthStore } from "../store/authStore";
import type { IdentityDocumentKind } from "../types";

export function IdentityVerifyPage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["identity", "me"],
    queryFn: getMyIdentity,
    enabled: Boolean(user),
  });
  const [kind, setKind] = useState<IdentityDocumentKind>("passport_by");
  const [document, setDocument] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submit = useMutation({
    mutationFn: submitIdentity,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["identity", "me"] });
      const next = await fetchMyProfile();
      setUser(next);
    },
  });

  if (!user) {
    return <Navigate to="/login?next=/me/verify" replace />;
  }

  const mine = query.data;
  const locked = mine?.status === "verified" || mine?.status === "pending";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!document || !selfie) {
      setError("Нужны фото разворота и селфи");
      return;
    }
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      await submit.mutateAsync({
        document_kind: kind,
        full_name: String(form.get("full_name")),
        personal_number: String(form.get("personal_number")),
        document_number: String(form.get("document_number")),
        document,
        selfie,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось отправить");
    }
  }

  return (
    <Section className="py-12 md:py-16">
      <Page narrow>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Личность</p>
        <h1 className="mt-2 font-display text-4xl uppercase leading-[1.05] tracking-tight md:text-6xl">Проверка</h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Паспорт или ID и селфи. Модератор сравнивает лицо с документом. Без подтверждения нельзя ни создать заявку, ни взяться — даже дарму.
        </p>

        {query.isLoading ? <p className="mt-8 text-muted-foreground">Загружаем статус…</p> : null}

        {mine?.status === "verified" ? (
          <div className="mt-10 border border-border p-6">
            <p className="inline-flex items-center gap-2 font-display text-2xl uppercase">
              <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
              Проверен
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {mine.full_name}. Личный номер {mine.personal_masked}.
            </p>
            {mine.has_document || mine.has_selfie ? <MinePhotos hasDocument={mine.has_document} hasSelfie={mine.has_selfie} /> : null}
            <p className="mt-6">
              <Link className="font-semibold text-primary" to="/me">
                Назад в профиль
              </Link>
            </p>
          </div>
        ) : null}

        {mine?.status === "pending" ? (
          <div className="mt-10 border border-border p-6">
            <p className="font-display text-2xl uppercase">{identityStatusLabel("pending")}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Модератор видит эти кадры. Обычно это недолго. Создавать и брать заявки пока нельзя.
            </p>
            <MinePhotos hasDocument={Boolean(mine.has_document)} hasSelfie={Boolean(mine.has_selfie)} />
          </div>
        ) : null}

        {mine?.status === "rejected" ? (
          <p className="mt-8 border border-destructive p-4 text-sm text-destructive" role="alert">
            Отклонено: {mine.reject_reason}. Можно отправить заново.
          </p>
        ) : null}

        {!locked && !query.isLoading ? (
          <form className="mt-10 space-y-8" onSubmit={(event) => void onSubmit(event)}>
            <fieldset>
              <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Документ
              </legend>
              <div className="flex flex-wrap gap-2">
                {DOCUMENT_KINDS.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setKind(row.id)}
                    className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 border px-3 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                      kind === row.id
                        ? "border-primary bg-primary text-on-primary"
                        : "border-border hover:border-primary hover:text-primary"
                    }`}
                  >
                    <IdCard className="h-3.5 w-3.5" aria-hidden="true" />
                    {row.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <PhotoCapture
              label="Разворот"
              hint="Страница с фото и личным номером, без бликов."
              facing="environment"
              value={document}
              onChange={setDocument}
            />
            <PhotoCapture
              label="Селфи"
              hint="Лицо целиком, как на документе. Модератор сверит сам."
              facing="user"
              value={selfie}
              onChange={setSelfie}
            />
            <Input label="ФИО как в документе" name="full_name" required minLength={2} maxLength={80} />
            <Input
              label="Личный номер"
              name="personal_number"
              required
              minLength={8}
              maxLength={20}
              autoComplete="off"
            />
            <Input
              label="Номер документа"
              name="document_number"
              required
              minLength={4}
              maxLength={32}
              autoComplete="off"
            />
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" variant="accent" className="w-full" size="lg" disabled={submit.isPending}>
              {submit.isPending ? "Отправляем…" : "Отправить на проверку"}
            </Button>
          </form>
        ) : null}
      </Page>
    </Section>
  );
}

function MinePhotos({ hasDocument, hasSelfie }: { hasDocument: boolean; hasSelfie: boolean }) {
  if (!hasDocument && !hasSelfie) {
    return null;
  }
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {hasDocument ? <IdentityBlobPhoto path="/api/v1/identity/me/document" label="Разворот" /> : null}
      {hasSelfie ? <IdentityBlobPhoto path="/api/v1/identity/me/selfie" label="Селфи" /> : null}
    </div>
  );
}
