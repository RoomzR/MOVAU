import { X } from "lucide-react";

import type { AnalystCell } from "../../types";
import { Button } from "../ui/Button";

type Props = {
  cell: AnalystCell;
  onClose: () => void;
};

export function AnalystCellCard({ cell, onClose }: Props) {
  return (
    <article className="border border-border bg-background/95 p-4 shadow-lg backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Ячейка</p>
          <h2 className="mt-2 font-display text-2xl uppercase leading-tight">{cell.count} заявок</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {cell.lat.toFixed(4)}, {cell.lng.toFixed(4)}
          </p>
        </div>
        <Button variant="ghost" aria-label="Закрыть" onClick={onClose}>
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}
