import { Footprints, MapPin, MessageSquareOff, Radio } from "lucide-react";
import { useState } from "react";

import { HomeMinskMap } from "./HomeMinskMap";

const STEPS = [
  {
    n: "01",
    title: "Точка",
    text: "Ставите заявку с координатами. Категория, адрес, дарма или цена. Не «кто поможет в лс».",
    Icon: MapPin,
  },
  {
    n: "02",
    title: "Смена берёт",
    text: "Кто рядом и на смене — видит точку и берёт. Никто не обязан писать первым в пустой чат.",
    Icon: Radio,
  },
  {
    n: "03",
    title: "Идут",
    text: "Идут к вам. Как маршрут на карте: смена уже в пути. Чат — только у сторон этой заявки.",
    Icon: Footprints,
  },
];

const VOID = [
  { who: "Вы", text: "Кто рядом, помогите с аптекой" },
  { who: "Статус", text: "Доставлено" },
  { who: "Статус", text: "Нет ответа" },
];

const GO_PATHS = [
  { d: "M 48 230 Q 180 188 320 140", duration: 10, delay: 0 },
  { d: "M 600 236 Q 470 186 320 140", duration: 12, delay: 0.28 },
  { d: "M 540 36 Q 430 88 320 140", duration: 14, delay: 0.55 },
];

export function ThreeSteps() {
  const [active, setActive] = useState(0);
  const step = STEPS[active];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-6 pt-8 md:px-10 lg:px-16 lg:pt-10">
        <h2 className="font-display text-[clamp(2.5rem,6vw,5.5rem)] uppercase leading-[0.9] tracking-tight">
          Три шага.
          <span className="block text-primary">Без чата в пустоту.</span>
        </h2>
      </div>

      <div className="mt-8 flex min-h-0 flex-1 flex-col border-t border-zinc-800 lg:flex-row">
        <aside className="flex min-h-[200px] flex-col border-b border-zinc-800 p-6 lg:w-[34%] lg:border-b-0 lg:border-r lg:p-8">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <MessageSquareOff className="h-4 w-4 text-destructive" aria-hidden="true" />
            Чат в пустоту
          </p>
          <ul className="mt-8 flex flex-1 flex-col justify-center gap-4">
            {VOID.map((line, index) => (
              <li
                key={`${line.who}-${index}`}
                className={`max-w-[18rem] px-4 py-3 ${
                  line.who === "Вы" ? "self-end bg-zinc-900" : "self-start bg-muted text-muted-foreground"
                }`}
              >
                <p className="text-[10px] uppercase tracking-[0.16em] opacity-60">{line.who}</p>
                <p className={`mt-1 text-sm leading-relaxed ${line.who !== "Вы" ? "italic" : ""}`}>{line.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-8 font-display text-sm uppercase tracking-tight text-muted-foreground line-through decoration-destructive/60">
            Напишите и ждите
          </p>
        </aside>

        <div className="flex min-h-[320px] min-w-0 flex-1 flex-col">
          <div className="relative min-h-[200px] flex-1 overflow-hidden bg-ink">
            <HomeMinskMap zoom={14} />
            <StepScene index={active} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/90 to-transparent px-6 pb-6 pt-16 lg:px-8">
              <p className="font-display text-xs text-primary">{step.n}</p>
              <h3 className="mt-1 font-display text-3xl uppercase leading-none md:text-4xl">{step.title}</h3>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">{step.text}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 border-t border-zinc-800" role="tablist" aria-label="Три шага">
            {STEPS.map((item, index) => {
              const on = index === active;
              return (
                <button
                  key={item.n}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setActive(index)}
                  className={`flex min-h-14 cursor-pointer flex-col items-start gap-1 px-4 py-4 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring md:min-h-16 md:px-6 ${
                    on ? "bg-primary text-on-primary" : "hover:bg-zinc-900/80"
                  }`}
                >
                  <span className={`text-[10px] uppercase tracking-[0.16em] ${on ? "opacity-70" : "text-primary"}`}>
                    {item.n}
                  </span>
                  <span className="inline-flex items-center gap-2 font-display text-sm uppercase leading-none md:text-base">
                    <item.Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {item.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepScene({ index }: { index: number }) {
  return (
    <svg viewBox="0 0 640 280" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      {index >= 1 ? (
        <>
          <circle cx="320" cy="140" r="72" className="radar-ring" fill="none" stroke="rgba(122,92,255,0.42)" strokeWidth="1.4" />
          <circle
            cx="320"
            cy="140"
            r="114"
            className="radar-ring"
            fill="none"
            stroke="rgba(122,92,255,0.2)"
            strokeWidth="1.2"
            style={{ animationDelay: "0.5s" }}
          />
        </>
      ) : null}
      {index === 2 ? (
        <g>
          {GO_PATHS.map((path) => (
            <g key={path.d}>
              <path className="route-draw" d={path.d} pathLength={1} style={{ animationDelay: `${path.delay}s` }} />
              <path className="route-flow" d={path.d} pathLength={1} style={{ animationDelay: `${path.delay + 0.35}s` }} />
              <g
                className="route-walker"
                style={{
                  offsetPath: `path("${path.d}")`,
                  animationDuration: `${path.duration}s`,
                  animationDelay: `${path.delay + 0.85}s`,
                }}
              >
                <circle r="5" cy="-7" fill="#7a5cff" />
                <rect x="-2.4" y="-1" width="4.8" height="10" fill="#7a5cff" />
              </g>
            </g>
          ))}
        </g>
      ) : null}
      <circle cx="320" cy="140" r={index === 0 ? 22 : 16} className="pin-pulse" fill="#c8f542" />
      <rect x="314.5" y="134.5" width="11" height="11" fill="#c8f542" />
    </svg>
  );
}
