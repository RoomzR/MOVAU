import type { ReactNode } from "react";

type Props = {
  columns: string[];
  loading?: boolean;
  error?: string | null;
  empty?: string;
  children: ReactNode;
  minWidth?: string;
};

export function AdminTable({
  columns,
  loading = false,
  error,
  empty,
  children,
  minWidth = "640px",
}: Props) {
  return (
    <div
      className="scroll-volt mt-4 max-h-[min(60svh,32rem)] overflow-auto border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring"
      role="region"
      aria-label="Таблица"
      tabIndex={0}
    >
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <thead className="border-b border-border text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {loading ? <p className="px-4 py-6 text-sm text-muted-foreground">Загружаем…</p> : null}
      {!loading && empty ? <p className="px-4 py-6 text-sm text-muted-foreground">{empty}</p> : null}
      {error ? (
        <p className="px-4 py-6 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
