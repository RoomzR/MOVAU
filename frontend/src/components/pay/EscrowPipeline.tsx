import type { HelpRequestStatus, HoldStatus, PaymentStatus } from "../../types";

type Props = {
  status: HelpRequestStatus;
  holdStatus?: HoldStatus | null;
  paymentStatus?: PaymentStatus | null;
  price?: string | number | null;
  legend?: boolean;
};

const STEPS = [
  { id: "created", title: "Создана", hint: null },
  { id: "paid", title: "Оплачена", hint: "заморожено" },
  { id: "done", title: "Исполнена", hint: null },
  { id: "paidOut", title: "Выплачено", hint: "исполнителю" },
] as const;

type Tone = "done" | "current" | "todo";

export function EscrowPipeline({ status, holdStatus, paymentStatus, price, legend = false }: Props) {
  const paidKind = paymentStatus ?? holdStatus;
  const isFree = !price || paidKind === "free";
  const paid = !isFree && (paidKind === "held" || paidKind === "released" || paidKind === "refunded");
  const completed = status === "completed";
  const paidOut = paidKind === "released";
  const refunded = paidKind === "refunded";
  const flags = [true, paid, completed, paidOut];
  let current = 0;
  flags.forEach((on, index) => {
    if (on) {
      current = index;
    }
  });
  const tones: Tone[] = flags.map((_, index) => {
    if (legend) {
      return "done";
    }
    if (index < current) {
      return "done";
    }
    if (index === current) {
      return "current";
    }
    return "todo";
  });

  return (
    <ol className="mt-4 grid grid-cols-2 items-stretch gap-2 sm:grid-cols-4">
      {STEPS.map((step, index) => {
        const tone = tones[index];
        const caption =
          legend
            ? step.hint
            : step.id === "paid" && isFree
              ? "дарма, без холда"
              : step.id === "paidOut" && refunded
                ? "возврат"
                : step.hint;
        const box =
          tone === "current"
            ? "border-primary text-foreground"
            : tone === "done"
              ? "border-border text-foreground"
              : "border-border text-muted-foreground";
        return (
          <li key={step.id} className={`flex h-full flex-col border px-3 py-3 ${box}`}>
            <p className="font-display text-lg leading-none text-primary tabular-nums">{index + 1}</p>
            <p className="mt-2 text-sm leading-5">{step.title}</p>
            <p className="mt-auto min-h-10 text-sm leading-5 text-muted-foreground">{caption ?? "\u00a0"}</p>
          </li>
        );
      })}
    </ol>
  );
}
