type Props = {
  items: string[];
};

export function Marquee({ items }: Props) {
  const row = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-primary bg-background text-primary" aria-hidden="true">
      <div className="marquee-track">
        {row.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="flex items-center gap-10 px-10 py-3 font-display text-sm uppercase tracking-[0.2em]"
          >
            {item}
            <span className="opacity-40">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
