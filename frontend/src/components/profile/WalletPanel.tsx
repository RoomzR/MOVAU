import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { ApiError } from "../../api/client";
import { getWallet, topupWallet } from "../../api/wallet";
import { formatMoney, holdLabel, txnLabel } from "../../lib/labels";
import { EscrowPipeline } from "../pay/EscrowPipeline";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { ScrollPane } from "../ui/ScrollPane";

export function WalletPanel() {
  const queryClient = useQueryClient();
  const [topupAmount, setTopupAmount] = useState("50");
  const walletQuery = useQuery({
    queryKey: ["wallet", "me"],
    queryFn: getWallet,
  });
  const topup = useMutation({
    mutationFn: (amount: number) => topupWallet(amount),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["wallet", "me"] });
    },
  });
  const holds = walletQuery.data?.holds ?? [];
  const txns = walletQuery.data?.txns ?? [];

  return (
    <div className="mt-8 border border-border p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Кошелёк</p>
      <p className="mt-2 font-display text-2xl leading-snug">{formatMoney(walletQuery.data?.balance)} BYN</p>
      <EscrowPipeline legend status="open" />
      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          const amount = Number(topupAmount);
          if (!Number.isFinite(amount)) {
            return;
          }
          topup.mutate(amount);
        }}
      >
        <div className="min-w-0 flex-1">
          <Input
            label="Пополнить, BYN"
            name="topup"
            type="number"
            min={1}
            max={10000}
            step="0.01"
            value={topupAmount}
            onChange={(event) => setTopupAmount(event.target.value)}
          />
        </div>
        <Button type="submit" variant="ghost" disabled={topup.isPending}>
          {topup.isPending ? "Пополняем…" : "Пополнить"}
        </Button>
      </form>
      <p className="mt-2 text-xs text-muted-foreground">Демо-кошелёк, без Stripe и PayPal.</p>
      {topup.error instanceof ApiError || topup.error instanceof Error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {topup.error.message}
        </p>
      ) : null}
      <ScrollPane label="Холды и проводки" className="mt-4 max-h-56">
        {holds.length > 0 ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Холды</p>
            <ul className="mt-2 divide-y divide-border border-y border-border">
              {holds.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <div>
                    <Link to={`/requests/${row.help_request_id}`} className="font-medium hover:text-primary">
                      Заявка
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">{holdLabel(row.status) ?? row.status}</p>
                  </div>
                  <p className="tabular-nums">{formatMoney(row.amount)} BYN</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {txns.length > 0 ? (
          <div className={holds.length > 0 ? "mt-4" : undefined}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Проводки</p>
            <ul className="mt-2 divide-y divide-border border-y border-border">
              {txns.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <div>
                    <p className="font-medium">{txnLabel(row.kind)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(row.created_at).toLocaleString("ru-BY", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {row.help_request_id ? (
                        <>
                          {" · "}
                          <Link to={`/requests/${row.help_request_id}`} className="hover:text-primary">
                            заявка
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <p className="tabular-nums">{formatMoney(row.amount)} BYN</p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="py-3 text-sm text-muted-foreground">Проводок пока нет.</p>
        )}
      </ScrollPane>
    </div>
  );
}
