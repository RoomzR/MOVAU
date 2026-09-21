import { Send } from "lucide-react";
import { Link } from "react-router-dom";

import { DOC_UPDATED, SITE_GROUPS, SITE_LINKS, TELEGRAM_CHANNEL } from "../../content/sitePages";
import { Container } from "./Container";

type Props = {
  tone?: "dim" | "volt";
};

function labelFor(slug: string) {
  return SITE_LINKS.find((item) => item.slug === slug)?.label ?? slug;
}

export function AppFooter({ tone = "dim" }: Props) {
  const volt = tone === "volt";
  const mute = volt ? "text-on-primary/70" : "text-muted-foreground";
  const mark = volt ? "text-on-primary" : "text-foreground";
  const hover = volt ? "hover:text-on-primary" : "hover:text-primary";
  const line = volt ? "border-on-primary/20" : "border-zinc-800";

  return (
    <footer className={volt ? "border-t border-on-primary/25" : "mt-auto border-t border-zinc-800"}>
      <Container className={`py-5 md:py-8 ${mute}`}>
        <div className="grid gap-8 lg:grid-cols-[minmax(12rem,0.85fr)_minmax(0,1.55fr)_minmax(11rem,0.7fr)] lg:items-start lg:gap-12">
          <div>
            <Link to="/" className={`inline-flex items-center ${hover}`}>
              <img src="/logo.png" alt="MOVAŬ" className="h-6 w-auto" />
            </Link>
            <p className="mt-2 max-w-[16rem] text-xs leading-relaxed">Мова дапамогі · Беларусь · Speak help</p>
          </div>

          <nav aria-label="О сервисе" className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3">
            {SITE_GROUPS.map((group) => (
              <div key={group.title}>
                <p className={`font-display text-[10px] uppercase tracking-[0.18em] ${mark}`}>{group.title}</p>
                <ul className="mt-3 space-y-0.5">
                  {group.slugs.map((slug) => (
                    <li key={slug}>
                      <Link
                        className={`inline-flex min-h-9 items-center text-xs leading-none ${hover}`}
                        to={`/about/${slug}`}
                      >
                        {labelFor(slug)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="lg:justify-self-end">
            <p className={`font-display text-[10px] uppercase tracking-[0.18em] ${mark}`}>Канал</p>
            <a
              className={`mt-3 inline-flex min-h-11 items-center gap-2 text-xs ${hover}`}
              href={TELEGRAM_CHANNEL}
              target="_blank"
              rel="noreferrer"
            >
              <Send className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              t.me/MOVAUBY
            </a>
          </div>
        </div>

        <div className={`mt-6 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-[11px] ${line}`}>
          <p>© 2026 MOVAŬ</p>
          <p>Редакция документов: {DOC_UPDATED}</p>
        </div>
      </Container>
    </footer>
  );
}
