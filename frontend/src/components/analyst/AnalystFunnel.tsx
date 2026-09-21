import type { AnalystFunnel as Funnel } from "../../types";

type Props = {
  funnel: Funnel;
};

const STEPS: { key: keyof Funnel; label: string }[] = [
  { key: "created", label: "Создано" },
  { key: "taken", label: "Взято" },
  { key: "completed", label: "Выполнено" },
  { key: "cancelled", label: "Отменено" },
];

export function AnalystFunnel({ funnel }: Props) {
  const base = funnel.created;
  return (
    <ul className="mt-6 space-y-3">
      {STEPS.map((step) => {
        const value = funnel[step.key];
        const pct = base === 0 ? 0 : Math.round((value / base) * 100);
        return (
          <li key={step.key}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{step.label}</span>
              <span className="text-muted-foreground">
                {value}
                <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.14em]">{pct}%</span>
              </span>
            </div>
            <span className="block h-3 bg-zinc-800" aria-hidden="true">
              <span
                className="block h-3 bg-primary motion-reduce:transition-none"
                style={{ width: `${pct}%` }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
