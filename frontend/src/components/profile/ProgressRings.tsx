import { useEffect, useState } from "react";

import { formatRating } from "../../lib/labels";
import type { IdentityStatus } from "../../types";

type Props = {
  identityStatus: IdentityStatus | null | undefined;
  karmaPoints: number;
  ratingAvg: number | null | undefined;
};

type Ring = {
  label: string;
  value: string;
  progress: number;
  radius: number;
  className: string;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function ProgressRings({ identityStatus, karmaPoints, ratingAvg }: Props) {
  const [motion, setMotion] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotion(!media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const identity = identityStatus === "verified" ? 1 : 0;
  const karma = clamp01(Math.min(20, Math.max(0, karmaPoints)) / 20);
  const rating = ratingAvg == null ? 0 : clamp01(ratingAvg / 5);
  const rings: Ring[] = [
    { label: "Личность", value: identity ? "да" : "нет", progress: identity, radius: 88, className: "stroke-primary" },
    { label: "Карма", value: String(karmaPoints), progress: karma, radius: 68, className: "stroke-secondary" },
    { label: "Оценка", value: formatRating(ratingAvg), progress: rating, radius: 48, className: "stroke-foreground" },
  ];
  const summary = rings.map((ring) => `${ring.label} ${ring.value}`).join(", ");

  return (
    <div className="mt-10 flex flex-col items-center gap-8 sm:flex-row sm:items-center">
      <svg
        viewBox="0 0 220 220"
        className="h-52 w-52 shrink-0"
        role="img"
        aria-label={summary}
      >
        {rings.map((ring) => {
          const length = 2 * Math.PI * ring.radius;
          const dash = length * ring.progress;
          return (
            <g key={ring.label}>
              <circle
                cx="110"
                cy="110"
                r={ring.radius}
                fill="none"
                className="stroke-border"
                strokeWidth="12"
              />
              <circle
                cx="110"
                cy="110"
                r={ring.radius}
                fill="none"
                className={ring.className}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${length}`}
                transform="rotate(-90 110 110)"
                style={motion ? { transition: "stroke-dasharray 600ms ease" } : undefined}
              />
            </g>
          );
        })}
      </svg>
      <ul className="grid w-full max-w-xs gap-3">
        {rings.map((ring) => (
          <li key={ring.label} className="flex items-baseline justify-between gap-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {ring.label}
            </span>
            <span className="font-display text-xl tabular-nums">{ring.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
