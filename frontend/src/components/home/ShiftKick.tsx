import { ArrowRight, Eye, EyeOff, MapPin, Radio } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { useAuthStore } from "../../store/authStore";
import { useShiftStore } from "../../store/shiftStore";
import { Button } from "../ui/Button";
import { HomeMinskMap } from "./HomeMinskMap";

const FIELD_PATHS = [
  { d: "M 80 520 Q 260 390 480 300", duration: 14, delay: 0 },
  { d: "M 900 120 Q 700 210 480 300", duration: 16, delay: 0.4 },
  { d: "M 140 140 Q 300 220 480 300", duration: 13, delay: 0.8 },
  { d: "M 820 540 Q 640 400 480 300", duration: 15, delay: 0.2 },
];

export function ShiftKick() {
  const reduce = useReducedMotion();
  const user = useAuthStore((state) => state.user);
  const onShift = useShiftStore((state) => state.onShift);
  const pending = useShiftStore((state) => state.pending);
  const error = useShiftStore((state) => state.error);
  const start = useShiftStore((state) => state.start);
  const stop = useShiftStore((state) => state.stop);
  const isExecutor = Boolean(user?.roles.includes("executor"));
  const live = isExecutor && onShift;
  const href = user ? "/me" : "/register?shift=1";

  const hint = !user
    ? "Регистрация исполнителем — и ты на карте."
    : !isExecutor
      ? "Включите роль исполнителя, чтобы выйти на смену."
      : live
        ? "Тебя видят. Берёшь заявки рядом."
        : "Радио. Тебя видно. Берёшь рядом.";

  async function toggle() {
    if (pending) {
      return;
    }
    await (onShift ? stop() : start());
  }

  const switchNode = <SwitchTrack on={live} pending={pending} reduce={reduce === true} />;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-ink">
      <HomeMinskMap zoom={13} className={live ? "" : "opacity-55"} />
      <ShiftWalkers live={live} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink from-10% via-ink/65 to-ink/15" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink to-transparent" />

      <span className="pointer-events-none absolute left-5 top-5 z-20 h-8 w-8 border-l-2 border-t-2 border-primary/50 md:left-8 md:top-8" />
      <span className="pointer-events-none absolute right-5 top-5 z-20 h-8 w-8 border-r-2 border-t-2 border-primary/50 md:right-8 md:top-8" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between gap-10 px-6 py-10 md:px-10 lg:flex-row lg:items-end lg:gap-16 lg:px-16 lg:py-14">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Радио</p>
          <h2 className="mt-4 font-display text-[clamp(3rem,9vw,7.5rem)] uppercase leading-[0.86] tracking-[-0.05em]">
            Включить
            <span className={`block ${live ? "text-secondary" : "text-primary"}`}>смену</span>
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">{hint}</p>
        </div>

        <div className="w-full max-w-lg">
          {isExecutor ? (
            <button
              type="button"
              disabled={pending}
              aria-pressed={onShift}
              aria-label={onShift ? "Выйти со смены" : "Выйти на смену"}
              className="w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void toggle()}
            >
              {switchNode}
            </button>
          ) : (
            <Link to={href} className="block cursor-pointer" aria-label="Включить смену">
              {switchNode}
            </Link>
          )}

          <dl className="mt-6 grid grid-cols-3 border-t border-zinc-800">
            <StatusCell
              icon={live ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              label="Видимость"
              value={pending ? "Место…" : live ? "На карте" : "Скрыт"}
              hot={live}
            />
            <StatusCell icon={<Radio className="h-4 w-4" />} label="Радио" value={live ? "Live" : "Выкл"} hot={live} />
            <StatusCell
              icon={<MapPin className="h-4 w-4" />}
              label="Рядом"
              value={live ? "Видно" : "Выкл"}
              hot={live}
            />
          </dl>

          {error && isExecutor ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              {!isExecutor
                ? user
                  ? "Сначала роль исполнителя в профиле."
                  : "Пульт откроет регистрацию исполнителя."
                : pending
                  ? "Определяем место…"
                  : "Геолокация нужна, чтобы вас было видно."}
            </p>
          )}

          <div className="mt-6">
            <Link to="/requests" className="inline-flex">
              <Button size="lg">
                {live ? "К заявкам" : "Смотреть заявки"}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCell({
  icon,
  label,
  value,
  hot,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hot: boolean;
}) {
  return (
    <div className="px-1 py-4 first:pl-0 last:pr-0">
      <dt className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <span className={hot ? "text-secondary" : ""} aria-hidden="true">
          {icon}
        </span>
        {label}
      </dt>
      <dd className={`mt-2 font-display text-sm uppercase ${hot ? "text-secondary" : "text-foreground"}`}>{value}</dd>
    </div>
  );
}

function SwitchTrack({ on, pending, reduce }: { on: boolean; pending: boolean; reduce: boolean }) {
  return (
    <div
      className={`relative flex h-24 items-center justify-between overflow-hidden border-2 px-6 font-display text-xl uppercase tracking-[0.18em] md:h-28 md:text-3xl ${
        on ? "border-secondary bg-secondary/20" : "border-primary/70 bg-ink"
      }`}
    >
      <motion.span
        aria-hidden="true"
        className={`absolute top-1.5 bottom-1.5 z-0 w-[calc(50%-8px)] ${on ? "bg-secondary" : "bg-primary"}`}
        initial={false}
        animate={{ left: on ? "calc(50% + 2px)" : "6px" }}
        transition={reduce || pending ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
      />
      <span className={`relative z-10 ${on ? "text-muted-foreground" : "text-on-primary"}`}>Выкл</span>
      <span className={`relative z-10 inline-flex items-center gap-2 ${on ? "text-foreground" : "text-muted-foreground"}`}>
        {on ? <span className="inline-block h-2.5 w-2.5 bg-foreground" /> : null}
        Live
      </span>
    </div>
  );
}

function ShiftWalkers({ live }: { live: boolean }) {
  return (
    <svg
      viewBox="0 0 960 640"
      preserveAspectRatio="xMidYMid slice"
      className={`shift-field pointer-events-none absolute inset-0 h-full w-full ${live ? "is-live" : ""}`}
      aria-hidden="true"
    >
      {FIELD_PATHS.map((path) => (
        <g key={path.d}>
          <path className="route-draw" d={path.d} pathLength={1} style={{ animationDelay: `${path.delay}s` }} />
          <path className="route-flow" d={path.d} pathLength={1} style={{ animationDelay: `${path.delay + 0.4}s` }} />
          <g
            className="route-walker"
            style={{
              offsetPath: `path("${path.d}")`,
              animationDuration: `${path.duration}s`,
              animationDelay: `${path.delay + 0.9}s`,
            }}
          >
            <circle r="5" cy="-7" fill="#7a5cff" />
            <rect x="-2.4" y="-1" width="4.8" height="10" fill="#7a5cff" />
          </g>
        </g>
      ))}
      <circle cx="480" cy="300" r="22" className="pin-pulse" fill="#c8f542" />
      <rect x="474.5" y="294.5" width="11" height="11" fill="#c8f542" />
    </svg>
  );
}
