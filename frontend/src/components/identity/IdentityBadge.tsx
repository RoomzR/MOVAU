import { ShieldCheck } from "lucide-react";

export function IdentityBadge() {
  return (
    <span className="inline-flex min-h-11 items-center gap-1.5 border border-primary bg-primary px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-on-primary">
      <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Проверен
    </span>
  );
}
