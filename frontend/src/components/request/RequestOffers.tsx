import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "../../api/client";
import { acceptOffer, createOffer, listOffers, withdrawOffer } from "../../api/offers";
import { IdentityHint } from "../identity/IdentityHint";
import { Container } from "../layout/Container";
import { Button } from "../ui/Button";
import { ScrollPane } from "../ui/ScrollPane";
import { Textarea } from "../ui/Textarea";
import { offerLabel } from "../../lib/labels";

type Props = {
  requestId: string;
  userId: string;
  isOwner: boolean;
  canOffer: boolean;
};

export function RequestOffers({ requestId, userId, isOwner, canOffer }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["request", requestId, "offers"],
    queryFn: () => listOffers(requestId),
    refetchInterval: 8000,
  });
  const create = useMutation({
    mutationFn: () => createOffer(requestId, message.trim() || undefined),
    onSuccess: async () => {
      setMessage("");
      await queryClient.invalidateQueries({ queryKey: ["request", requestId, "offers"] });
    },
  });
  const withdraw = useMutation({
    mutationFn: (id: string) => withdrawOffer(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["request", requestId, "offers"] });
    },
  });
  const accept = useMutation({
    mutationFn: (id: string) => acceptOffer(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["request", requestId] });
      await queryClient.invalidateQueries({ queryKey: ["request", requestId, "offers"] });
      await queryClient.invalidateQueries({ queryKey: ["requests"] });
      await queryClient.invalidateQueries({ queryKey: ["wallet", "me"] });
      navigate(`/requests/${requestId}#chat`, { replace: true });
    },
  });
  const rows = query.data ?? [];
  const mine = rows.find((row) => row.executor_id === userId);
  const minePending = mine?.status === "pending";
  const actionError =
    create.error ??
    (actionId && withdraw.error && withdraw.variables === actionId ? withdraw.error : null) ??
    (actionId && accept.error && accept.variables === actionId ? accept.error : null) ??
    withdraw.error ??
    accept.error;

  return (
    <div className="border-t border-border">
      <Container className="py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Отклики</p>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
          Отклик — очередь у автора. «Возьмусь» назначает сразу.
        </p>
        {query.isLoading ? <p className="mt-6 text-sm text-muted-foreground">Загружаем…</p> : null}
        {!query.isLoading && rows.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            {isOwner ? "Пока нет откликов." : "Вы ещё не откликались."}
          </p>
        ) : null}
        {rows.length > 0 ? (
          <ScrollPane label="Отклики" className="mt-6 max-h-[min(50svh,24rem)]">
            <ul className="divide-y divide-border border-y border-border">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <Link to={`/users/${row.executor_id}`} className="font-medium hover:text-primary">
                    {row.executor_display_name}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">{offerLabel(row.status)}</p>
                  {row.message ? <p className="mt-2 whitespace-pre-wrap text-sm">{row.message}</p> : null}
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  {isOwner && row.status === "pending" ? (
                    <Button
                      variant="accent"
                      disabled={accept.isPending}
                      onClick={() => {
                        setActionId(row.id);
                        accept.mutate(row.id);
                      }}
                    >
                      {accept.isPending && actionId === row.id ? "Назначаем…" : "Назначить"}
                    </Button>
                  ) : null}
                  {canOffer && row.executor_id === userId && row.status === "pending" ? (
                    <Button
                      variant="ghost"
                      disabled={withdraw.isPending}
                      onClick={() => {
                        setActionId(row.id);
                        withdraw.mutate(row.id);
                      }}
                    >
                      {withdraw.isPending && actionId === row.id ? "Отзываем…" : "Отозвать"}
                    </Button>
                  ) : null}
                  {actionError instanceof ApiError || actionError instanceof Error
                    ? actionId === row.id && (
                        <p className="max-w-xs text-sm text-destructive" role="alert">
                          {actionError.message}
                        </p>
                      )
                    : null}
                </div>
              </li>
            ))}
            </ul>
          </ScrollPane>
        ) : null}
        {canOffer && !minePending ? (
          <form
            className="mt-8 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setActionId(null);
              create.mutate();
            }}
          >
            <Textarea
              label="Сообщение автору"
              name="offer-message"
              rows={3}
              maxLength={280}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <Button type="submit" variant="ghost" disabled={create.isPending}>
              {create.isPending ? "Отправляем…" : "Откликнуться"}
            </Button>
            {create.error instanceof ApiError || create.error instanceof Error ? (
              <p className="text-sm text-destructive" role="alert">
                {create.error.message}
              </p>
            ) : null}
            <IdentityHint error={create.error} />
          </form>
        ) : null}
        {actionId == null && (withdraw.error instanceof ApiError || withdraw.error instanceof Error) ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {withdraw.error.message}
          </p>
        ) : null}
      </Container>
    </div>
  );
}
