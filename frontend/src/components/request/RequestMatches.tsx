import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { clickMatch, listMatches } from "../../api/requests";
import { Container } from "../layout/Container";
import { formatDistance } from "../../lib/labels";
import { ScrollPane } from "../ui/ScrollPane";

const MATCH_RADIUS_M = 5000;

type Props = {
  requestId: string;
};

function distancePts(meters: number) {
  return Math.round(50 * Math.max(0, 1 - meters / MATCH_RADIUS_M));
}

function karmaPts(karmaPoints: number) {
  return Math.min(20, Math.max(0, karmaPoints));
}

export function RequestMatches({ requestId }: Props) {
  const query = useQuery({
    queryKey: ["request", requestId, "matches"],
    queryFn: () => listMatches(requestId),
    refetchInterval: 8000,
  });
  const rows = query.data ?? [];
  const variant = rows[0]?.variant;

  return (
    <div className="border-t border-border">
      <Container className="py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Кто рядом</p>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
          Люди на смене в пяти километрах. Баллы 0–100: дистанция до 50, навык 30, карма до 20. Отклик — очередь у
          автора; «Возьмусь» назначает сразу.
        </p>
        {variant === "ranked" ? (
          <p className="mt-2 text-sm text-muted-foreground">Значок «AI рекомендует» — топ-3 по баллам, не нейросеть.</p>
        ) : null}
        {variant === "random" ? (
          <p className="mt-2 text-sm text-muted-foreground">Контрольная выборка: тот же пул в случайном порядке.</p>
        ) : null}
        {query.isLoading ? <p className="mt-6 text-sm text-muted-foreground">Загружаем…</p> : null}
        {!query.isLoading && rows.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">Никого на смене рядом.</p>
        ) : null}
        {rows.length > 0 ? (
          <ScrollPane label="Кто рядом" className="mt-6 max-h-[min(50svh,24rem)]">
            <ul className="divide-y divide-border border-y border-border">
            {rows.map((row) => (
              <li key={row.user_id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <Link
                    to={`/users/${row.user_id}`}
                    className="font-medium hover:text-primary"
                    onClick={() => {
                      void clickMatch(requestId, row.user_id).catch(() => {
                        /* клик для CTR, навигация важнее */
                      });
                    }}
                  >
                    {row.display_name}
                  </Link>
                  {row.recommended ? (
                    <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      AI рекомендует
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDistance(row.meters) ?? `${row.meters} м`}
                    {" · "}
                    {row.skill_match ? "навык совпал" : "другой навык"}
                    {" · карма "}
                    {row.karma_points}
                  </p>
                </div>
                <p className="text-right text-sm tabular-nums text-muted-foreground">
                  {row.score} баллов 0–100
                  <span className="mt-1 block text-xs">
                    дистанция {distancePts(row.meters)} + навык {row.skill_match ? 30 : 0} + карма{" "}
                    {karmaPts(row.karma_points)}
                  </span>
                </p>
              </li>
            ))}
            </ul>
          </ScrollPane>
        ) : null}
      </Container>
    </div>
  );
}
