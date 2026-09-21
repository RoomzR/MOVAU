import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HandHelping, MapPin, MessageSquare, ScanLine, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "../../api/client";
import { createOffer } from "../../api/offers";
import { takeRequest } from "../../api/requests";
import { PaymentQr } from "../pay/PaymentQr";
import { Button } from "../ui/Button";
import { CategoryChip, StatusChip } from "../ui/CategoryChip";
import { formatDistance } from "../../lib/labels";
import { IdentityHint } from "../identity/IdentityHint";
import { EtaCountdown } from "../request/EtaCountdown";
import { useAuthStore } from "../../store/authStore";
import type { HelpRequest } from "../../types";

type Props = {
  item: HelpRequest;
  onClose: () => void;
};

export function RequestPeekCard({ item, onClose }: Props) {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isOwner = Boolean(user && user.id === item.client_id);
  const isExecutor = Boolean(user?.roles.includes("executor"));
  const isVolunteer = Boolean(user?.roles.includes("volunteer"));
  const canTake = Boolean(
    user && !isOwner && item.status === "open" && (isExecutor || (isVolunteer && !item.price)),
  );
  const assignedToMe = Boolean(user && item.executor_id === user.id);
  const canOpenChat = Boolean(
    user && (isOwner || assignedToMe) && item.status !== "open" && item.status !== "cancelled",
  );
  const take = useMutation({
    mutationFn: () => takeRequest(item.id),
    onSuccess: async (next) => {
      await queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.setQueryData(["request", next.id], next);
      navigate(`/requests/${next.id}#chat`);
    },
  });
  const offer = useMutation({
    mutationFn: () => createOffer(item.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["request", item.id, "offers"] });
    },
  });
  const distance = formatDistance(item.distance_m);
  const roleHint = !user || isOwner || item.status !== "open"
    ? null
    : isVolunteer && item.price
      ? "Платные заявки — только исполнителю."
      : !isExecutor && !isVolunteer
        ? "Нужна роль исполнителя."
        : null;

  return (
    <article className="scroll-volt flex max-h-[min(78svh,640px)] w-full flex-col overflow-y-auto border-2 border-border bg-card p-6 shadow-[0_24px_80px_rgba(0,0,0,.55)] md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <CategoryChip value={item.category} />
          <StatusChip value={item.status} />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label="Закрыть карточку"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <h2 className="mt-3 font-display text-3xl uppercase leading-[1.1] tracking-tight md:text-4xl">{item.title}</h2>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
      <p className="mt-5 inline-flex items-center gap-1.5 text-sm">
        <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="truncate">
          {distance ? `${distance} · ` : ""}
          {item.address_text || `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`}
        </span>
      </p>
      <p className="mt-4 font-display text-2xl">{item.price ? `${item.price} BYN` : "Дарма"}</p>
      <div className="mt-3">
        <EtaCountdown etaAt={item.eta_at} />
      </div>

      {isOwner ? (
        <div className="mt-6 border-t border-border pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">QR заявки</p>
          <div className="mt-4">
            <PaymentQr item={item} compact />
          </div>
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        {!user ? (
          <Button variant="accent" onClick={() => navigate(`/login?next=/requests/${item.id}`)}>
            Войти, чтобы взяться
          </Button>
        ) : null}
        {canTake ? (
          <>
            <Button variant="accent" onClick={() => take.mutate()} disabled={take.isPending}>
              <HandHelping className="mr-2 h-4 w-4" aria-hidden="true" />
              {take.isPending ? "Берём…" : "Возьмусь"}
            </Button>
            <Button variant="ghost" onClick={() => offer.mutate()} disabled={offer.isPending}>
              {offer.isPending ? "Отправляем…" : "Откликнуться"}
            </Button>
          </>
        ) : null}
        {canOpenChat ? (
          <Link to={`/requests/${item.id}#chat`}>
            <Button variant="accent">
              <MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" />
              Открыть чат
            </Button>
          </Link>
        ) : (
          <Link to={`/requests/${item.id}`}>
            <Button variant="ghost">Подробнее</Button>
          </Link>
        )}
        {assignedToMe && (item.status === "assigned" || item.status === "in_progress") ? (
          <Link to="/scan">
            <Button variant="ghost">
              <ScanLine className="mr-2 h-4 w-4" aria-hidden="true" />
              Сканировать QR
            </Button>
          </Link>
        ) : null}
        {isOwner && item.status === "open" ? (
          <p className="self-center text-sm text-muted-foreground">
            Ждём «Возьмусь» или{" "}
            <Link className="font-semibold text-primary" to={`/requests/${item.id}`}>
              отклик
            </Link>
            .
          </p>
        ) : null}
        {isOwner && item.status !== "open" ? (
          <p className="self-center text-sm text-muted-foreground">Это ваша заявка.</p>
        ) : null}
        {roleHint ? <p className="self-center text-sm text-muted-foreground">{roleHint}</p> : null}
      </div>
      {take.error instanceof ApiError || take.error instanceof Error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {take.error.message}
        </p>
      ) : null}
      {offer.error instanceof ApiError || offer.error instanceof Error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {offer.error.message}
        </p>
      ) : null}
      <div className="mt-3">
        <IdentityHint error={take.error ?? offer.error} />
      </div>
    </article>
  );
}
