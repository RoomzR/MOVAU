import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { listUserReviews } from "../api/reviews";
import { fetchUser } from "../api/users";
import { IdentityBadge } from "../components/identity/IdentityBadge";
import { Page } from "../components/layout/Page";
import { Section } from "../components/layout/Section";
import { ProgressRings } from "../components/profile/ProgressRings";
import { AvatarMark } from "../components/ui/AvatarMark";
import { RoleChip } from "../components/ui/RoleChip";
import { ScrollPane } from "../components/ui/ScrollPane";
import { SkillChips } from "../components/ui/SkillChips";
import { StatGrid, StatTile } from "../components/ui/StatTile";
import { clientLevelLabel } from "../lib/labels";
import { useAuthStore } from "../store/authStore";

export function ProfilePage() {
  const { id } = useParams();
  const me = useAuthStore((state) => state.user);
  const query = useQuery({
    queryKey: ["user", id],
    queryFn: () => fetchUser(id!),
    enabled: Boolean(id),
  });
  const reviewsQuery = useQuery({
    queryKey: ["user", id, "reviews"],
    queryFn: () => listUserReviews(id!),
    enabled: Boolean(id),
  });

  if (query.isLoading) {
    return (
      <Section className="py-16">
        <Page narrow>
          <p className="text-muted-foreground">Загружаем профиль…</p>
        </Page>
      </Section>
    );
  }
  if (query.isError || !query.data) {
    return (
      <Section className="py-16">
        <Page narrow>
          <p className="text-destructive">Профиль не найден.</p>
        </Page>
      </Section>
    );
  }

  const person = query.data;
  const mine = me?.id === person.id;
  const reviews = reviewsQuery.data ?? [];

  return (
    <Section className="py-12 md:py-16">
      <Page narrow>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Человек</p>
        <div className="mt-4 flex items-start gap-4">
          <AvatarMark name={person.display_name} size="lg" />
          <div className="min-w-0">
            <h1 className="font-display text-4xl uppercase leading-[1.05] tracking-tight md:text-6xl">
              {person.display_name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{clientLevelLabel(person.client_level)}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {person.identity_status === "verified" ? <IdentityBadge /> : null}
          {person.roles.map((role) => (
            <RoleChip key={role} role={role} />
          ))}
        </div>
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
          {person.bio || "Пока без описания."}
        </p>
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Навыки</p>
          <SkillChips value={person.skills ?? ""} />
        </div>
        <ProgressRings
          identityStatus={person.identity_status}
          karmaPoints={person.karma_points ?? 0}
          ratingAvg={person.rating_avg}
        />
        <StatGrid>
          <StatTile label="Уровень">{clientLevelLabel(person.client_level)}</StatTile>
          <StatTile label="Оценок" className="sm:border-r-0">
            {person.rating_count ?? 0}
          </StatTile>
          <StatTile label="Выполнено" className="border-b-0 sm:col-span-2 sm:border-r-0">
            {person.completed_as_client ?? 0}
          </StatTile>
        </StatGrid>
        <div className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Отзывы</p>
          {reviewsQuery.isError ? (
            <p className="mt-4 text-sm text-destructive">Не удалось загрузить отзывы.</p>
          ) : reviews.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Оценок пока нет.</p>
          ) : (
            <ScrollPane label="Отзывы" className="mt-4 max-h-[min(50svh,24rem)]">
              <ul className="divide-y divide-border border-y border-border">
                {reviews.map((row) => (
                  <li key={row.id} className="py-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <Link to={`/users/${row.author_id}`} className="font-display text-xl hover:text-primary">
                        {row.author_display_name}
                      </Link>
                      <p className="tabular-nums text-sm">{row.score} из 5</p>
                    </div>
                    {row.comment ? (
                      <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed">{row.comment}</p>
                    ) : null}
                    <p className="mt-2 text-sm text-muted-foreground">
                      <time dateTime={row.created_at}>
                        {new Date(row.created_at).toLocaleString("ru-BY", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </time>
                      {" · "}
                      <Link to={`/requests/${row.help_request_id}`} className="hover:text-primary">
                        заявка
                      </Link>
                    </p>
                  </li>
                ))}
              </ul>
            </ScrollPane>
          )}
        </div>
        {mine ? (
          <p className="mt-8">
            <Link className="font-semibold text-primary" to="/me">
              Редактировать профиль
            </Link>
          </p>
        ) : null}
      </Page>
    </Section>
  );
}
