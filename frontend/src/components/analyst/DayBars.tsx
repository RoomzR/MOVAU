import type { AnalystDay } from "../../types";

type Props = {
  series: AnalystDay[];
};

function tickEvery(days: number) {
  if (days <= 7) {
    return 1;
  }
  if (days <= 30) {
    return 5;
  }
  return 14;
}

function formatTick(date: string) {
  const parts = date.split("-");
  if (parts.length !== 3) {
    return date;
  }
  return `${parts[2]}.${parts[1]}`;
}

export function DayBars({ series }: Props) {
  const max = Math.max(1, ...series.map((row) => Math.max(row.created, row.completed)));
  const step = tickEvery(series.length);
  const compact = series.length > 7;
  const barW = compact ? 7 : 16;
  const gap = compact ? 6 : 14;
  const pair = barW * 2 + 3;
  const chartH = 180;
  const axisH = 28;
  const padL = 36;
  const padR = 12;
  const daySlot = pair + gap;
  const inner = Math.max(series.length * daySlot, compact ? series.length * daySlot : 420);
  const width = padL + inner + padR;
  const height = chartH + axisH;
  const mid = Math.round(max / 2);
  const showValues = series.length <= 7;

  return (
    <figure className="mt-6 overflow-x-auto border border-border">
      <figcaption className="sr-only">Созданные и выполненные заявки по дням</figcaption>
      <svg
        role="img"
        aria-label="Столбцы: созданные и выполненные по дням"
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 text-primary"
        style={{ minWidth: compact ? Math.max(width, 640) : "100%", width: compact ? width : "100%" }}
      >
        <line x1={padL} y1={0} x2={padL} y2={chartH} className="stroke-border" />
        <line x1={padL} y1={chartH} x2={width - padR} y2={chartH} className="stroke-border" />
        {[0, mid, max].map((tick) => {
          const y = chartH - (tick / max) * chartH;
          return (
            <g key={tick}>
              <line x1={padL} y1={y} x2={width - padR} y2={y} className="stroke-border" strokeDasharray="4 6" />
              <text x={padL - 6} y={y + 4} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: 10 }}>
                {tick}
              </text>
            </g>
          );
        })}
        {series.map((row, index) => {
          const x = padL + index * daySlot;
          const createdH = (row.created / max) * chartH;
          const completedH = (row.completed / max) * chartH;
          const showTick = index % step === 0 || index === series.length - 1;
          return (
            <g key={row.date}>
              <rect
                x={x}
                y={chartH - createdH}
                width={barW}
                height={createdH}
                className="fill-primary motion-reduce:transition-none"
              >
                <title>{`${row.date}: создано ${row.created}`}</title>
              </rect>
              <rect
                x={x + barW + 3}
                y={chartH - completedH}
                width={barW}
                height={completedH}
                className="fill-muted-foreground/50 motion-reduce:transition-none"
              >
                <title>{`${row.date}: выполнено ${row.completed}`}</title>
              </rect>
              {showValues && row.created > 0 ? (
                <text
                  x={x + barW / 2}
                  y={chartH - createdH - 4}
                  textAnchor="middle"
                  className="fill-foreground"
                  style={{ fontSize: 10 }}
                >
                  {row.created}
                </text>
              ) : null}
              {showTick ? (
                <text
                  x={x + pair / 2}
                  y={chartH + 18}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  style={{ fontSize: 10 }}
                >
                  {formatTick(row.date)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <p className="flex gap-4 border-t border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 bg-primary" aria-hidden="true" />
          Создано
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 bg-muted-foreground/50" aria-hidden="true" />
          Выполнено
        </span>
      </p>
    </figure>
  );
}
