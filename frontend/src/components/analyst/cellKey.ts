import type { AnalystCell } from "../../types";

export function cellKey(cell: AnalystCell) {
  return `${cell.lat.toFixed(5)}:${cell.lng.toFixed(5)}`;
}
