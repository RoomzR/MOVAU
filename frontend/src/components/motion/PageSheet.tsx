import type { ReactNode } from "react";

type Tone = "dim" | "raised" | "deep" | "volt";

type Props = {
  children: ReactNode;
  tone?: Tone;
  index: string;
  title: string;
};

const tones: Record<Tone, string> = {
  dim: "bg-background text-foreground",
  raised: "bg-card text-foreground",
  deep: "bg-ink text-on-ink",
  volt: "bg-primary text-on-primary",
};

export function PageSheet({ children, tone = "dim", index, title }: Props) {
  const mute = tone === "volt" ? "opacity-70" : "text-muted-foreground";

  return (
    <section className={`page-sheet ${tones[tone]}`}>
      <div className="page-sheet-inner">
        <div className="flex shrink-0 items-center justify-between border-b border-current/15 px-6 py-3 md:px-10 lg:px-16">
          <p className={`font-display text-xs tracking-[0.22em] ${mute}`}>{index}</p>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${mute}`}>{title}</p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </section>
  );
}
