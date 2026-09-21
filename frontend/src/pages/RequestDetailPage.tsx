import { HubConnectionState } from "@microsoft/signalr";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, HandHelping, ImagePlus, MapPin, Phone, RotateCcw, ScanLine, Send, Star } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { ApiError } from "../api/client";
import { listMessages, sendMessage } from "../api/messages";
import { cancelRequest, completeRequest, getRequest, getRequestLocation, pingRequestLocation, refuseRequest, repeatRequest, setEta, startRequest, takeRequest } from "../api/requests";
import { createDispute, listDisputes } from "../api/disputes";
import { listReviews, sendReview } from "../api/reviews";
import { Container } from "../components/layout/Container";
import { Section } from "../components/layout/Section";
import { RequestTrackMap } from "../components/map/RequestTrackMap";
import { IdentityHint } from "../components/identity/IdentityHint";
import { PaymentQr } from "../components/pay/PaymentQr";
import { EscrowPipeline } from "../components/pay/EscrowPipeline";
import { ChatImage } from "../components/request/ChatImage";
import { EtaCountdown } from "../components/request/EtaCountdown";
import { RequestEdit } from "../components/request/RequestEdit";
import { RequestMatches } from "../components/request/RequestMatches";
import { RequestOffers } from "../components/request/RequestOffers";
import { Button } from "../components/ui/Button";
import { CategoryChip, StatusChip } from "../components/ui/CategoryChip";
import { Textarea } from "../components/ui/Textarea";
import { disputeLabel, holdLabel } from "../lib/labels";
import { compressImage } from "../lib/compressImage";
import { useRequestChatHub } from "../lib/useRequestChatHub";
import { useAuthStore } from "../store/authStore";
import type { ChatMessage, Dispute, Review } from "../types";

const ETA_MINUTES = [5, 10, 15, 20, 30];

export function RequestDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["request", id],
    queryFn: () => getRequest(id!),
    enabled: Boolean(id),
    refetchInterval: (current) => {
      const row = current.state.data;
      const uid = useAuthStore.getState().user?.id;
      if (!row || !uid || row.client_id !== uid || row.status !== "open") {
        return false;
      }
      return 4000;
    },
  });
  const isExecutor = Boolean(user?.roles.includes("executor"));
  const isVolunteer = Boolean(user?.roles.includes("volunteer"));
  const item = query.data;
  const isOwner = Boolean(user && item && user.id === item.client_id);
  const isAssignee = Boolean(user && item?.executor_id === user.id);
  const canTake = Boolean(user && item && !isOwner && item.status === "open" && (isExecutor || (isVolunteer && !item.price)));
  const canChat = Boolean(user && item && (isOwner || isAssignee) && item.status !== "open" && item.status !== "cancelled");
  const canWatch = Boolean(user && item && (isOwner || canChat));
  const canReview = Boolean(user && item && (isOwner || isAssignee) && item.status === "completed");
  const canDispute = Boolean(user && item && (isOwner || isAssignee) && item.status !== "open" && item.status !== "cancelled");
  const canTrack = Boolean(
    user && item && (isOwner || isAssignee) && (item.status === "assigned" || item.status === "in_progress"),
  );
  const showContact = Boolean(user && item && (isOwner || isAssignee) && item.status !== "open");

  useEffect(() => {
    const target = location.hash === "#chat" ? "chat" : location.hash === "#review" ? "review" : null;
    if (!target) {
      return;
    }
    document.getElementById(target)?.scrollIntoView({ block: "start" });
  }, [location.hash, item?.id, canChat, canReview]);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["request", id] });
    await queryClient.invalidateQueries({ queryKey: ["requests"] });
    await queryClient.invalidateQueries({ queryKey: ["requests", "mine"] });
    await queryClient.invalidateQueries({ queryKey: ["wallet", "me"] });
  }

  const cancel = useMutation({
    mutationFn: () => cancelRequest(id!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["requests"] });
      navigate("/requests/mine");
    },
  });
  const take = useMutation({
    mutationFn: () => takeRequest(id!),
    onSuccess: async (next) => {
      queryClient.setQueryData(["request", next.id], next);
      await refresh();
      navigate(`/requests/${next.id}#chat`, { replace: true });
    },
  });
  const refuse = useMutation({
    mutationFn: () => refuseRequest(id!),
    onSuccess: async () => {
      await refresh();
      navigate("/requests");
    },
  });
  const start = useMutation({
    mutationFn: () => startRequest(id!),
    onSuccess: refresh,
  });
  const eta = useMutation({
    mutationFn: (minutes: number) => setEta(id!, minutes),
    onSuccess: refresh,
  });
  const complete = useMutation({
    mutationFn: () => completeRequest(id!),
    onSuccess: refresh,
  });
  const repeat = useMutation({
    mutationFn: () => repeatRequest(id!),
    onSuccess: (next) => {
      navigate(`/requests/${next.id}`);
    },
  });
  const hubState = useRequestChatHub(id, canWatch);
  const messagesQuery = useQuery({
    queryKey: ["messages", id],
    queryFn: () => listMessages(id!),
    enabled: Boolean(id) && canChat,
    refetchInterval: canChat && hubState !== HubConnectionState.Connected ? 4000 : false,
    refetchIntervalInBackground: false,
  });
  const send = useMutation({
    mutationFn: ({ body, image }: { body: string; image?: string }) => sendMessage(id!, body, image),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["messages", id] });
      await queryClient.invalidateQueries({ queryKey: ["request", id] });
    },
  });
  const reviewsQuery = useQuery({
    queryKey: ["reviews", id],
    queryFn: () => listReviews(id!),
    enabled: Boolean(id) && canReview,
  });
  const review = useMutation({
    mutationFn: ({ score, comment }: { score: number; comment: string }) => sendReview(id!, score, comment),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reviews", id] });
    },
  });
  const disputesQuery = useQuery({
    queryKey: ["disputes", id],
    queryFn: () => listDisputes(id!),
    enabled: Boolean(id) && canDispute,
  });
  const dispute = useMutation({
    mutationFn: (reason: string) => createDispute(id!, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["disputes", id] });
    },
  });
  const locationQuery = useQuery({
    queryKey: ["request-location", id],
    queryFn: () => getRequestLocation(id!),
    enabled: Boolean(id) && canTrack,
    retry: false,
    refetchInterval: canTrack && hubState !== HubConnectionState.Connected ? 10_000 : false,
  });

  useEffect(() => {
    if (!id || !isAssignee || !canTrack) {
      return;
    }
    let live = true;
    async function ping() {
      if (!navigator.geolocation) {
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          void pingRequestLocation(id!, position.coords.latitude, position.coords.longitude)
            .then((dto) => {
              if (live) {
                queryClient.setQueryData(["request-location", id], dto);
              }
            })
            .catch(() => {
              /* нет прав или заявка уже не активна */
            });
        },
        () => {
          /* клиент отказал в геолокации */
        },
      );
    }
    void ping();
    const timer = window.setInterval(() => void ping(), 12_000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [canTrack, id, isAssignee, queryClient]);

  if (query.isLoading) {
    return (
      <Section screen className="flex items-center">
        <Container>
          <p className="text-muted-foreground">Загружаем заявку…</p>
        </Container>
      </Section>
    );
  }
  if (query.isError || !item) {
    return (
      <Section screen className="flex items-center">
        <Container>
          <p className="text-destructive">Заявка не найдена.</p>
        </Container>
      </Section>
    );
  }

  const canCancel = isOwner && (item.status === "open" || item.status === "assigned" || item.status === "in_progress");
  const roleHint = !user || isOwner || item.status !== "open"
    ? null
    : isVolunteer && item.price
      ? "Платные заявки — только исполнителю."
      : !isExecutor && !isVolunteer
        ? "Нужна роль исполнителя."
        : null;
  const actionError =
    take.error ?? refuse.error ?? start.error ?? eta.error ?? complete.error ?? cancel.error ?? repeat.error;

  return (
    <Section screen className="flex flex-col">
      <Container className="py-12 md:py-16">
        <div className="flex flex-wrap gap-2">
          <CategoryChip value={item.category} />
          <StatusChip value={item.status} />
        </div>
        <h1 className="mt-4 max-w-4xl font-display text-4xl leading-snug tracking-tight md:text-6xl">{item.title}</h1>
        <p className="mt-8 max-w-3xl whitespace-pre-wrap text-lg leading-relaxed text-muted-foreground">
          {item.description}
        </p>
      </Container>
      <dl className="mt-auto grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
        <div className="border-b border-border p-8 sm:border-r lg:border-b-0">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Статус</dt>
          <dd className="mt-3">
            <StatusChip value={item.status} />
          </dd>
          <div className="mt-3">
            <EtaCountdown etaAt={item.eta_at} />
          </div>
        </div>
        <div className="border-b border-border p-8 lg:border-b-0 lg:border-r">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Оплата</dt>
          <dd className="mt-3 font-display text-2xl leading-snug">{item.price ? `${item.price} BYN` : "Дарма"}</dd>
          {item.price && holdLabel(item.hold_status) ? (
            <p className="mt-2 text-sm text-muted-foreground">{holdLabel(item.hold_status)}</p>
          ) : null}
        </div>
        <div className="border-b border-border p-8 sm:border-r sm:border-b-0">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Точка</dt>
          <dd className="mt-3 inline-flex items-center gap-1.5 font-medium">
            <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
          </dd>
        </div>
        <div className="p-8">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Адрес</dt>
          <dd className="mt-3 font-medium">{item.address_text || "—"}</dd>
        </div>
      </dl>

      {showContact ? (
        <div className="border-t border-border">
          <Container className="py-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Связь</p>
            {item.contact_phone_verified && item.contact_phone ? (
              <a
                href={`tel:${item.contact_phone}`}
                className="mt-4 inline-flex min-h-11 items-center gap-2 font-medium text-primary"
              >
                <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.contact_phone}
              </a>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Номер не подтверждён.</p>
            )}
          </Container>
        </div>
      ) : null}

      {canTrack ? (
        <div className="border-t border-border">
          <Container className="py-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">На карте</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Точка заявки — volt, исполнитель — фиолет. Точка живёт около полутора минут.
            </p>
            <div className="relative mt-4 h-64 overflow-hidden border border-border">
              <RequestTrackMap request={item} executor={locationQuery.data ?? null} />
            </div>
          </Container>
        </div>
      ) : null}

      {isOwner || item.price ? (
        <div className="border-t border-border">
          <Container className="py-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">QR заявки</p>
            <EscrowPipeline
              status={item.status}
              holdStatus={item.hold_status}
              paymentStatus={item.payment_status}
              price={item.price}
            />
            <div className="mt-4">
              <PaymentQr item={item} />
            </div>
          </Container>
        </div>
      ) : null}

      {isOwner && item.status === "open" ? <RequestMatches requestId={item.id} /> : null}
      {(isOwner || canTake) && item.status === "open" && user ? (
        <RequestOffers requestId={item.id} userId={user.id} isOwner={isOwner} canOffer={canTake} />
      ) : null}
      {isOwner && item.status === "open" ? <RequestEdit item={item} /> : null}

      {canChat ? (
        <RequestChat
          messages={messagesQuery.data ?? []}
          pending={send.isPending}
          error={send.error}
          onSend={(body, image) => send.mutateAsync({ body, image })}
        />
      ) : null}

      {canDispute ? (
        <RequestDisputes
          rows={disputesQuery.data ?? []}
          userId={user!.id}
          pending={dispute.isPending}
          error={dispute.error}
          onSend={(reason) => dispute.mutateAsync(reason)}
        />
      ) : null}

      {canReview ? (
        <RequestReviews
          reviews={reviewsQuery.data ?? []}
          userId={user!.id}
          pending={review.isPending}
          error={review.error}
          onSend={(score, comment) => review.mutateAsync({ score, comment })}
        />
      ) : null}

      {canTake || isAssignee || canCancel || (isOwner && item.status === "completed") || (!user && item.status === "open") ? (
        <div className="border-t border-border">
          <Container className="space-y-6 py-8">
            {canTake || isAssignee || (!user && item.status === "open") ? (
              <div className="space-y-6">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Исполнитель</p>
                {roleHint ? <p className="text-sm text-muted-foreground">{roleHint}</p> : null}
                <div className="flex flex-wrap gap-3">
                  {canTake ? (
                    <Button variant="accent" onClick={() => take.mutate()} disabled={take.isPending}>
                      <HandHelping className="mr-2 h-4 w-4" aria-hidden="true" />
                      {take.isPending ? "Берём…" : "Возьмусь"}
                    </Button>
                  ) : null}
                  {!user && item.status === "open" ? (
                    <Button variant="accent" onClick={() => navigate(`/login?next=/requests/${item.id}`)}>
                      Войти, чтобы взяться
                    </Button>
                  ) : null}
                  {isAssignee && item.status === "assigned" ? (
                    <Button variant="accent" onClick={() => start.mutate()} disabled={start.isPending}>
                      В работе
                    </Button>
                  ) : null}
                </div>
                {isAssignee && (item.status === "assigned" || item.status === "in_progress") ? (
                  <div className="space-y-3">
                    <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
                      Приеду через
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ETA_MINUTES.map((minutes) => (
                        <Button
                          key={minutes}
                          variant="ghost"
                          onClick={() => eta.mutate(minutes)}
                          disabled={eta.isPending}
                        >
                          {minutes} мин
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {isAssignee && (item.status === "assigned" || item.status === "in_progress") ? (
                  <div className="flex flex-wrap gap-3">
                    {item.has_proof ? (
                      <Link to="/scan">
                        <Button variant="accent">
                          <ScanLine className="mr-2 h-4 w-4" aria-hidden="true" />
                          Сканировать QR клиента
                        </Button>
                      </Link>
                    ) : (
                      <p className="self-center text-sm text-muted-foreground">Сначала фото в чат — потом скан QR.</p>
                    )}
                    {item.status === "in_progress" && canChat ? (
                      <Button
                        variant="ghost"
                        onClick={() => send.mutate({ body: "Я на месте." })}
                        disabled={send.isPending}
                      >
                        Я на месте
                      </Button>
                    ) : null}
                    {item.status === "in_progress" ? (
                      <Button variant="ghost" onClick={() => complete.mutate()} disabled={complete.isPending}>
                        Закрыть без QR
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => refuse.mutate()}
                      disabled={refuse.isPending}
                    >
                      {refuse.isPending ? "Отдаём…" : "Отказаться"}
                    </Button>
                  </div>
                ) : null}
                {isAssignee && (item.status === "assigned" || item.status === "in_progress") ? (
                  <p className="text-sm text-muted-foreground">
                    Основной путь: фото в чат, клиент показывает QR, вы сканируете — оплата на кошелёк.
                  </p>
                ) : null}
              </div>
            ) : null}
            {canCancel ? (
              <Button variant="ghost" className="text-destructive" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
                Отменить заявку
              </Button>
            ) : null}
            {isOwner && item.status === "completed" ? (
              <div className="space-y-2">
                <Button variant="accent" onClick={() => repeat.mutate()} disabled={repeat.isPending}>
                  <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                  {repeat.isPending ? "Повторяем…" : "Повторить"}
                </Button>
                <p className="max-w-md text-sm text-muted-foreground">
                  Копия на той же точке. Людям на смене уйдёт колокол.
                </p>
              </div>
            ) : null}
            {actionError instanceof ApiError || actionError instanceof Error ? (
              <p className="text-sm text-destructive" role="alert">
                {actionError.message}
              </p>
            ) : null}
            <IdentityHint error={actionError} />
          </Container>
        </div>
      ) : actionError instanceof ApiError || actionError instanceof Error ? (
        <Container className="py-8">
          <p className="text-sm text-destructive" role="alert">
            {actionError.message}
          </p>
          <IdentityHint error={actionError} />
        </Container>
      ) : null}
    </Section>
  );
}

type RequestChatProps = {
  messages: ChatMessage[];
  pending: boolean;
  error: unknown;
  onSend: (body: string, image?: string) => Promise<unknown>;
};

function RequestChat({ messages, pending, error, onSend }: RequestChatProps) {
  const [body, setBody] = useState("");
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hash = useLocation().hash;

  useEffect(() => {
    if (hash === "#review") {
      return;
    }
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    inputRef.current?.focus();
  }, [hash]);

  useEffect(() => {
    const list = rootRef.current?.querySelector("[data-chat-log]");
    list?.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function onPick(file: File | undefined) {
    setPhotoError(null);
    if (!file) {
      return;
    }
    try {
      const dataUrl = await compressImage(file);
      setPhoto(dataUrl);
      setPhotoName(file.name);
    } catch (err) {
      setPhoto(null);
      setPhotoName(null);
      setPhotoError(err instanceof Error ? err.message : "Не удалось прочитать фото");
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();
    if (pending || (!text && !photo)) {
      return;
    }
    try {
      await onSend(text || "Фото к заявке", photo ?? undefined);
      setBody("");
      setPhoto(null);
      setPhotoName(null);
    } catch {
      /* ошибка уже в error */
    }
  }

  return (
    <div id="chat" ref={rootRef} className="border-t border-border">
      <Container className="py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Переписка</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Исполнитель присылает фото работы сюда — без него QR не закроет оплату.
        </p>
        {messages.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Пока нет сообщений по этой заявке.</p>
        ) : (
          <ul className="scroll-volt mt-6 max-h-[min(50svh,28rem)] space-y-0 overflow-y-auto" data-chat-log aria-live="polite">
            {messages.map((row) => (
              <li key={row.id} className="border-t border-border py-6 first:border-t-0 first:pt-0">
                <Link to={`/users/${row.author_id}`} className="font-display text-xl hover:text-primary">
                  {row.author_display_name}
                </Link>
                {row.body ? (
                  <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed">{row.body}</p>
                ) : null}
                {row.has_image ? <ChatImage messageId={row.id} /> : null}
                <time className="mt-2 block text-xs text-muted-foreground" dateTime={row.created_at}>
                  {new Date(row.created_at).toLocaleString("ru-RU")}
                </time>
              </li>
            ))}
          </ul>
        )}
        <form className="mt-8 flex flex-col gap-3" onSubmit={onSubmit}>
          <Textarea
            label="Сообщение"
            name="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            rows={3}
            ref={inputRef}
          />
          <div className="flex flex-wrap items-end gap-3">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-border px-3 text-sm hover:border-primary hover:text-primary">
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              {photoName ?? "Прикрепить фото"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => void onPick(event.target.files?.[0])}
              />
            </label>
            <Button type="submit" variant="accent" disabled={pending || (!body.trim() && !photo)}>
              <Send className="mr-2 h-4 w-4" aria-hidden="true" />
              Отправить
            </Button>
          </div>
        </form>
        {photoError ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {photoError}
          </p>
        ) : null}
        {error instanceof ApiError || error instanceof Error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error.message}
          </p>
        ) : null}
      </Container>
    </div>
  );
}

type RequestReviewsProps = {
  reviews: Review[];
  userId: string;
  pending: boolean;
  error: unknown;
  onSend: (score: number, comment: string) => Promise<unknown>;
};

function RequestReviews({ reviews, userId, pending, error, onSend }: RequestReviewsProps) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const mine = reviews.find((row) => row.author_id === userId);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (score < 1 || pending) {
      return;
    }
    try {
      await onSend(score, comment.trim());
      setComment("");
    } catch {
      /* ошибка уже в error */
    }
  }

  return (
    <div id="review" className="border-t border-border">
      <Container className="py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Оценка</p>
        {reviews.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Пока нет оценок по этой заявке.</p>
        ) : (
          <ul className="mt-6 space-y-0">
            {reviews.map((row) => (
              <li key={row.id} className="border-t border-border py-6 first:border-t-0 first:pt-0">
                <Link to={`/users/${row.author_id}`} className="font-display text-xl hover:text-primary">
                  {row.author_display_name}
                </Link>
                <p className="mt-2 font-display text-2xl leading-snug">{row.score} из 5</p>
                {row.comment ? (
                  <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed">{row.comment}</p>
                ) : null}
                <time className="mt-2 block text-xs text-muted-foreground" dateTime={row.created_at}>
                  {new Date(row.created_at).toLocaleString("ru-RU")}
                </time>
              </li>
            ))}
          </ul>
        )}
        {!mine ? (
          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <fieldset>
              <legend className="mb-3 text-sm font-medium">Ваша оценка</legend>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-label={`Оценка ${value}`}
                    aria-pressed={score === value}
                    onClick={() => setScore(value)}
                    className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 border px-3 text-sm font-semibold ${
                      score === value
                        ? "border-primary bg-primary text-on-primary"
                        : "border-border text-foreground hover:border-primary hover:text-primary"
                    }`}
                  >
                    <Star className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {value}
                  </button>
                ))}
              </div>
            </fieldset>
            <Textarea
              label="Комментарий"
              name="comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={500}
              rows={3}
            />
            <Button type="submit" variant="accent" disabled={pending || score < 1}>
              Отправить
            </Button>
          </form>
        ) : null}
        {error instanceof ApiError || error instanceof Error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error.message}
          </p>
        ) : null}
      </Container>
    </div>
  );
}

type RequestDisputesProps = {
  rows: Dispute[];
  userId: string;
  pending: boolean;
  error: unknown;
  onSend: (reason: string) => Promise<unknown>;
};

function RequestDisputes({ rows, userId, pending, error, onSend }: RequestDisputesProps) {
  const [reason, setReason] = useState("");
  const mineOpen = rows.some((row) => row.author_id === userId && row.status === "open");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = reason.trim();
    if (text.length < 8) {
      return;
    }
    await onSend(text);
    setReason("");
  }

  return (
    <div className="border-t border-border">
      <Container className="py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Спор</p>
        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Споров нет. Если что-то пошло не так — опишите.</p>
        ) : (
          <ul className="mt-6 space-y-0">
            {rows.map((row) => (
              <li key={row.id} className="border-t border-border py-6 first:border-t-0 first:pt-0">
                <p className="font-display text-xl">{row.author_display_name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">{disputeLabel(row.status)}</p>
                <p className="mt-2 whitespace-pre-wrap">{row.reason}</p>
                {row.resolution ? <p className="mt-2 text-sm text-muted-foreground">Решение: {row.resolution}</p> : null}
              </li>
            ))}
          </ul>
        )}
        {!mineOpen ? (
          <form className="mt-8 space-y-4" onSubmit={(event) => void onSubmit(event)}>
            <Textarea
              label="Причина"
              name="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={8}
              maxLength={500}
              rows={3}
              required
            />
            <Button type="submit" variant="ghost" disabled={pending}>
              Открыть спор
            </Button>
          </form>
        ) : null}
        {error instanceof ApiError || error instanceof Error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error.message}
          </p>
        ) : null}
      </Container>
    </div>
  );
}
