import { Activity, Footprints, Heart, Map, MapPin, MessageSquare, Radio } from "lucide-react";
import { useState } from "react";

const DEAD = [
  { category: "Аптека", time: "14:02", text: "Кто поможет с аптекой?", wait: "0 ответов" },
  { category: "Дорога", time: "13:47", text: "Пишите в лс, срочно", wait: "читает…" },
  { category: "Дом", time: "12:11", text: "Жду ответа уже час", wait: "тишина" },
];

const LOOP = [
  {
    n: "01",
    title: "Точка",
    text: "Заявка — место на карте: двор, подъезд, аптека. Не пост «кто поможет».",
    Icon: MapPin,
  },
  {
    n: "02",
    title: "Смена",
    text: "Включил радио — тебя видно. Берёшь рядом.",
    Icon: Radio,
  },
  {
    n: "03",
    title: "Идут",
    text: "Люди идут к тебе. Чат только у тех, кто уже в заявке.",
    Icon: Footprints,
  },
];

const SPEC = [
  { title: "Дарма", text: "карма копится", Icon: Heart },
  { title: "Страна", text: "все города", Icon: Map },
  { title: "Живое", text: "смена на карте", Icon: Activity },
];

export function SystemLoop() {
  const [active, setActive] = useState(0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4 px-6 pt-8 md:px-10 lg:px-16 lg:pt-10">
        <h2 className="font-display text-[clamp(2.5rem,6vw,5.5rem)] uppercase leading-[0.9] tracking-tight">
          Не лента.
          <span className="block text-primary">Система.</span>
        </h2>
        <p className="max-w-sm pb-1 text-muted-foreground">Контур помощи. Не доска объявлений.</p>
      </div>

      <div className="mt-8 grid min-h-0 flex-1 border-t border-zinc-800 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
        <aside className="flex min-h-[200px] flex-col border-b border-zinc-800 p-6 lg:border-b-0 lg:border-r lg:p-8">
          <p className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
              Лента
            </span>
            <span>0 ответов</span>
          </p>
          <ul className="mt-8 flex flex-1 flex-col justify-center">
            {DEAD.map((row) => (
              <li key={row.time} className="border-b border-zinc-800 py-5 last:border-b-0">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{row.category}</p>
                <p className="mt-1 font-display text-lg uppercase leading-tight text-muted-foreground/80 line-through decoration-zinc-600 md:text-xl">
                  {row.text}
                </p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">
                  {row.time} · {row.wait}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">Доска ждёт ответа. Мы — нет.</p>
        </aside>

        <div className="relative flex min-h-[300px] flex-col p-6 lg:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Протокол</p>
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              {SPEC.map((item) => (
                <li key={item.title} className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <item.Icon className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
                  <span className="font-display uppercase text-foreground">{item.title}</span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mt-6 flex min-h-0 flex-1">
            <div className="pointer-events-none absolute top-3 bottom-3 left-4 w-px bg-primary/50" aria-hidden="true">
              <span className="spine-pulse absolute left-1/2 h-2 w-2 -translate-x-1/2 bg-primary" />
            </div>
            <ol className="flex h-full min-h-0 w-full flex-col justify-between gap-3 pl-10">
              {LOOP.map((node, index) => {
                const on = index === active;
                return (
                  <li key={node.n}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setActive(index)}
                      className={`flex min-h-14 w-full cursor-pointer items-start gap-4 px-3 py-3 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:gap-5 ${
                        on ? "bg-primary text-on-primary" : "hover:bg-zinc-900"
                      }`}
                    >
                      <span className={`mt-1 font-display text-sm ${on ? "opacity-70" : "text-primary"}`}>{node.n}</span>
                      <node.Icon className={`mt-1 h-5 w-5 shrink-0 ${on ? "" : "text-primary"}`} aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block font-display text-3xl uppercase leading-none md:text-4xl">{node.title}</span>
                        <span
                          className={`mt-2 block max-w-md text-sm leading-relaxed ${on ? "opacity-80" : "text-muted-foreground"}`}
                        >
                          {node.text}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
