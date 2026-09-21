import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { listHeroes } from "../api/heroes";
import { Page } from "../components/layout/Page";
import { Section } from "../components/layout/Section";
import { formatRating } from "../lib/labels";
import { ScrollPane } from "../components/ui/ScrollPane";

export function HeroesPage() {
  const query = useQuery({ queryKey: ["heroes"], queryFn: listHeroes });

  return (
    <Section className="py-12 md:py-16">
      <Page>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Карма</p>
        <h1 className="mt-2 font-display text-5xl uppercase leading-[1.05] tracking-tight md:text-6xl">Герои района</h1>
        <p className="mt-4 max-w-xl text-muted-foreground">Волонтёры по сумме оценок. Дарма копится в карму.</p>
        <ScrollPane label="Герои района" className="mt-10 max-h-[min(50svh,24rem)]">
          <div className="divide-y divide-border border-y border-border">
            {(query.data ?? []).map((hero, index) => (
              <Link key={hero.id} to={`/users/${hero.id}`} className="flex flex-wrap items-center justify-between gap-4 py-6 hover:text-primary">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">#{index + 1}</p>
                  <h2 className="mt-1 font-display text-2xl">{hero.display_name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{hero.bio || "Помогает дарма."}</p>
                </div>
                <p className="text-sm">
                  Карма {hero.karma_points} · {formatRating(hero.rating_avg)}
                </p>
              </Link>
            ))}
            {query.data?.length === 0 ? <p className="py-10 text-muted-foreground">Пока пусто.</p> : null}
          </div>
        </ScrollPane>
      </Page>
    </Section>
  );
}
