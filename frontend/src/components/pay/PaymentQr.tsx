import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Link } from "react-router-dom";

import { ApiError } from "../../api/client";
import { getPayment, payRequest } from "../../api/payment";
import { useAuthStore } from "../../store/authStore";
import type { HelpRequest, PaymentStatus } from "../../types";
import { Button } from "../ui/Button";

type Props = {
  item: HelpRequest;
  compact?: boolean;
};

const STATUS: Record<PaymentStatus, string> = {
  free: "Дарма, без оплаты",
  unpaid: "Сначала оплатите с кошелька",
  held: "Деньги на холде до скана QR",
  released: "Выплачено исполнителю",
  refunded: "Возврат автору",
};

export function PaymentQr({ item, compact = false }: Props) {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [src, setSrc] = useState<string | null>(null);
  const isOwner = Boolean(user && user.id === item.client_id);
  const isAssignee = Boolean(user && item.executor_id === user.id);
  const hasSecret = Boolean(item.code || item.qr_payload);
  const paymentQuery = useQuery({
    queryKey: ["payment", item.id],
    queryFn: () => getPayment(item.id),
    enabled: isOwner && !hasSecret,
  });
  const pay = useMutation({
    mutationFn: () => payRequest(item.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["payment", item.id] });
      await queryClient.invalidateQueries({ queryKey: ["request", item.id] });
      await queryClient.invalidateQueries({ queryKey: ["requests"] });
      await queryClient.invalidateQueries({ queryKey: ["wallet", "me"] });
    },
  });
  const payment = paymentQuery.data;
  const status: PaymentStatus =
    payment?.status ??
    item.payment_status ??
    (item.price ? item.hold_status ?? "unpaid" : "free");
  const canPay = Boolean(isOwner && status === "unpaid");
  const qrValue =
    item.code && typeof window !== "undefined"
      ? `${window.location.origin}/scan/${item.code}`
      : item.qr_payload ??
        (payment?.code && typeof window !== "undefined"
          ? `${window.location.origin}/scan/${payment.code}`
          : payment?.qr_payload ?? null);

  useEffect(() => {
    if (!isOwner || !qrValue) {
      setSrc(null);
      return;
    }
    void QRCode.toDataURL(qrValue, {
      width: compact ? 128 : 176,
      margin: 1,
      color: { dark: "#08090C", light: "#C8F542" },
    }).then(setSrc);
  }, [compact, isOwner, qrValue]);

  if (!isOwner && !item.price) {
    return null;
  }

  return (
    <figure className={compact ? "space-y-2" : "space-y-3"}>
      {src ? <img src={src} alt="QR этой заявки" className={compact ? "h-28 w-28" : "h-40 w-40"} /> : null}
      <figcaption className="text-[11px] leading-snug text-muted-foreground">
        {isOwner
          ? `${STATUS[status]}. Покажите QR исполнителю, когда работа будет сделана.`
          : isAssignee
            ? "Когда закончите, отсканируйте QR клиента — деньги придут на кошелёк."
            : STATUS[status]}
      </figcaption>
      {isAssignee ? (
        <Link className="text-sm font-semibold text-primary" to="/scan">
          Открыть сканер
        </Link>
      ) : null}
      {canPay ? (
        <Button variant="accent" onClick={() => pay.mutate()} disabled={pay.isPending}>
          {pay.isPending ? "Оплачиваем…" : "Оплатить с кошелька"}
        </Button>
      ) : null}
      {canPay || pay.error ? (
        <p className="text-sm text-muted-foreground">
          Нет средств?{" "}
          <Link className="font-semibold text-primary" to="/me">
            Пополнить кошелёк
          </Link>
        </p>
      ) : null}
      {paymentQuery.error instanceof ApiError || paymentQuery.error instanceof Error ? (
        <p className="text-sm text-destructive" role="alert">
          {paymentQuery.error.message}
        </p>
      ) : null}
      {pay.error instanceof ApiError || pay.error instanceof Error ? (
        <p className="text-sm text-destructive" role="alert">
          {pay.error.message}
        </p>
      ) : null}
    </figure>
  );
}
