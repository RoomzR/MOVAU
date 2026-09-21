import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError } from "../../api/client";
import { adminReviewIdentity } from "../../api/identity";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { ScrollPane } from "../ui/ScrollPane";
import { documentKindLabel } from "../../lib/labels";
import { IdentityBlobPhoto } from "./IdentityBlobPhoto";
import type { AdminIdentity } from "../../types";

export function IdentityQueue({ items, loading = false }: { items: AdminIdentity[]; loading?: boolean }) {
  const queryClient = useQueryClient();
  const review = useMutation({
    mutationFn: ({ id, decision, reason }: { id: string; decision: "verified" | "rejected"; reason?: string }) =>
      adminReviewIdentity(id, decision, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });

  if (loading) {
    return <p className="mt-6 text-sm text-muted-foreground">Загружаем…</p>;
  }
  if (items.length === 0) {
    return <p className="mt-6 text-sm text-muted-foreground">Ничего нет.</p>;
  }

  return (
    <ScrollPane label="Очередь документов" className="mt-6 max-h-[min(50svh,24rem)]">
      <ul className="space-y-8">
      {items.map((row) => (
        <IdentityReviewCard
          key={row.id}
          row={row}
          pending={review.isPending}
          error={review.error}
          onReview={(decision, reason) => review.mutate({ id: row.id, decision, reason })}
        />
      ))}
      </ul>
    </ScrollPane>
  );
}

function IdentityReviewCard({
  row,
  pending,
  error,
  onReview,
}: {
  row: AdminIdentity;
  pending: boolean;
  error: unknown;
  onReview: (decision: "verified" | "rejected", reason?: string) => void;
}) {
  const [reason, setReason] = useState("");
  const canReview = row.status === "pending";

  return (
    <li className="border border-border p-6">
      <p className="font-display text-2xl uppercase leading-tight">{row.display_name}</p>
      <p className="mt-1 text-sm text-muted-foreground">{row.email}</p>
      <p className="mt-3 text-sm">
        {documentKindLabel(row.document_kind)} · {row.full_name}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Личный номер {row.personal_number} · документ {row.document_number}
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <IdentityBlobPhoto path={`/api/v1/admin/identity/${row.id}/document`} label="Разворот" />
        <IdentityBlobPhoto path={`/api/v1/admin/identity/${row.id}/selfie`} label="Селфи" />
      </div>
      {canReview ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Input
              label="Причина отказа"
              name={`reject-${row.id}`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <Button variant="accent" disabled={pending} onClick={() => onReview("verified")}>
            Одобрить
          </Button>
          <Button
            variant="ghost"
            className="text-destructive"
            disabled={pending}
            onClick={() => onReview("rejected", reason)}
          >
            Отклонить
          </Button>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          {row.status === "verified" ? "Одобрено" : row.reject_reason ?? "Отклонено"}
        </p>
      )}
      {error instanceof ApiError || error instanceof Error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error.message}
        </p>
      ) : null}
    </li>
  );
}
