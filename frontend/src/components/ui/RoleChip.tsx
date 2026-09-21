import { roleLabel } from "../../lib/labels";

export function RoleChip({ role }: { role: string }) {
  return (
    <span className="inline-flex min-h-11 items-center border border-border px-3 text-[11px] font-semibold uppercase tracking-[0.14em]">
      {roleLabel(role)}
    </span>
  );
}
