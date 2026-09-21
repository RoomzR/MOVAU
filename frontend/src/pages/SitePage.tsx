import { ArrowUpRight, Send } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";

import {
  DOC_UPDATED,
  isSiteSlug,
  sectionId,
  SITE_GROUPS,
  SITE_LINKS,
  SITE_PAGES,
  TELEGRAM_CHANNEL,
  type SiteBlock,
  type SiteSlug,
} from "../content/sitePages";
import { Page } from "../components/layout/Page";
import { Section } from "../components/layout/Section";

type LinkBlock = Extract<SiteBlock, { to: string }>;

type Segment =
  | { type: "h"; h: string }
  | { type: "p"; p: string }
  | { type: "facts"; facts: string[] }
  | { type: "links"; items: LinkBlock[] };

function groupBlocks(blocks: SiteBlock[]): Segment[] {
  const out: Segment[] = [];
  for (const block of blocks) {
    if ("h" in block) {
      out.push({ type: "h", h: block.h });
    } else if ("p" in block) {
      out.push({ type: "p", p: block.p });
    } else if ("facts" in block) {
      out.push({ type: "facts", facts: block.facts });
    } else {
      const last = out.at(-1);
      if (last?.type === "links") {
        last.items.push(block);
      } else {
        out.push({ type: "links", items: [block] });
      }
    }
  }
  return out;
}

function Kicker({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">{children}</p>;
}

function Toc({ headings }: { headings: string[] }) {
  if (headings.length === 0) {
    return null;
  }
  return (
    <nav aria-label="Содержание">
      <Kicker>Содержание</Kicker>
      <ol className="mt-4">
        {headings.map((heading, index) => (
          <li key={heading}>
            <a
              className="group flex min-h-11 items-center gap-3 text-sm text-muted-foreground hover:text-primary"
              href={`#${sectionId(heading)}`}
            >
              <span className="w-6 shrink-0 font-display text-[10px] uppercase tracking-[0.14em] text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="leading-snug">{heading}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function DocNav({ current }: { current: SiteSlug }) {
  return (
    <nav aria-label="Ещё о сервисе" className="space-y-8">
      {SITE_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="font-display text-[10px] uppercase tracking-[0.18em] text-foreground">{group.title}</p>
          <ul className="mt-3">
            {group.slugs.map((slug) => {
              const label = SITE_LINKS.find((item) => item.slug === slug)?.label ?? slug;
              const active = slug === current;
              return (
                <li key={slug}>
                  {active ? (
                    <span className="flex min-h-11 items-center border-l-2 border-primary pl-3 text-sm text-primary">
                      {label}
                    </span>
                  ) : (
                    <Link
                      className="flex min-h-11 items-center border-l-2 border-transparent pl-3 text-sm text-muted-foreground hover:border-zinc-600 hover:text-primary"
                      to={`/about/${slug}`}
                    >
                      {label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function LinkCard({ item }: { item: LinkBlock }) {
  const external = item.to.startsWith("http");
  const inner = (
    <>
      <span className="min-w-0">
        <span className="block font-display text-sm uppercase tracking-tight text-foreground group-hover:text-primary">
          {item.label}
        </span>
        {item.after ? <span className="mt-1 block text-sm leading-snug text-muted-foreground">{item.after}</span> : null}
      </span>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
    </>
  );
  const className =
    "group flex min-h-11 items-center justify-between gap-4 border border-zinc-800 bg-card px-4 py-3 hover:border-primary";
  if (external) {
    return (
      <a className={className} href={item.to} target="_blank" rel="noreferrer">
        {inner}
      </a>
    );
  }
  return (
    <Link className={className} to={item.to}>
      {inner}
    </Link>
  );
}

function Body({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === "h") {
          return (
            <h2
              key={segment.h}
              id={sectionId(segment.h)}
              className="mt-14 scroll-mt-28 border-l-2 border-primary pl-4 font-display text-2xl uppercase tracking-tight md:text-3xl"
            >
              {segment.h}
            </h2>
          );
        }
        if (segment.type === "p") {
          const afterHeading = segments[index - 1]?.type === "h";
          return (
            <p
              key={index}
              className={`mt-4 text-[1.05rem] leading-[1.75] ${afterHeading ? "text-foreground/90" : "text-muted-foreground"}`}
            >
              {segment.p}
            </p>
          );
        }
        if (segment.type === "facts") {
          return (
            <ul key={index} className="mt-5 space-y-0">
              {segment.facts.map((fact) => (
                <li
                  key={fact}
                  className="flex min-h-11 items-start gap-3 border-b border-zinc-800 py-3 text-[1.05rem] leading-relaxed text-muted-foreground last:border-b-0"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-primary" aria-hidden="true" />
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <div key={index} className="mt-6 grid gap-2">
            {segment.items.map((item) => (
              <LinkCard key={`${item.to}-${item.label}`} item={item} />
            ))}
          </div>
        );
      })}
    </>
  );
}

export function SitePage() {
  const slug = useParams().slug ?? "";
  if (!isSiteSlug(slug)) {
    return <Navigate to="/" replace />;
  }
  const doc = SITE_PAGES[slug];
  const headings = doc.blocks.flatMap((block) => ("h" in block ? [block.h] : []));
  const segments = groupBlocks(doc.blocks);

  return (
    <Section>
      <header className="relative overflow-hidden border-b border-zinc-800">
        <div className="hero-grid opacity-40" aria-hidden="true" />
        <Page width="page" className="relative py-12 md:py-16">
          <Kicker>{doc.kicker}</Kicker>
          <h1 className="neon-text mt-3 max-w-4xl font-display text-[clamp(2.75rem,7vw,6.5rem)] uppercase leading-[0.9] tracking-tight">
            {doc.title}
          </h1>
          {doc.lede ? (
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{doc.lede}</p>
          ) : null}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <span className="inline-flex min-h-9 items-center border border-zinc-800 px-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Редакция {doc.updated}
            </span>
            {slug === "about" ? (
              <span className="inline-flex min-h-9 items-center bg-primary px-3 font-display text-[11px] uppercase tracking-[0.16em] text-on-primary">
                Читается мовай
              </span>
            ) : null}
          </div>
        </Page>
      </header>

      <Page width="page" className="py-10 md:py-14">
        <div className="xl:grid xl:grid-cols-[14rem_minmax(0,40rem)_15rem] xl:items-start xl:justify-center xl:gap-x-14">
          <aside className="mb-10 border-b border-zinc-800 pb-8 xl:sticky xl:top-24 xl:mb-0 xl:border-b-0 xl:pb-0">
            <Toc headings={headings} />
          </aside>

          <article>
            <Body segments={segments} />

            <aside className="mt-14 border border-zinc-800 bg-card p-5 md:p-6">
              <Kicker>Канал</Kicker>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                Новости проекта, пресса, претензии и запросы по данным — сюда. Паспорт и селфи в канал не слать.
              </p>
              <a
                className="mt-5 inline-flex min-h-11 items-center gap-2 font-display text-sm uppercase tracking-tight text-primary hover:underline"
                href={TELEGRAM_CHANNEL}
                target="_blank"
                rel="noreferrer"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                t.me/MOVAUBY
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Редакция документов: {DOC_UPDATED}
              </p>
            </aside>
          </article>

          <aside className="mt-14 border-t border-zinc-800 pt-8 xl:sticky xl:top-24 xl:mt-0 xl:border-t-0 xl:pt-0">
            <p className="mb-6 font-display text-[10px] uppercase tracking-[0.18em] text-foreground">Ещё о сервисе</p>
            <DocNav current={slug} />
          </aside>
        </div>
      </Page>
    </Section>
  );
}
