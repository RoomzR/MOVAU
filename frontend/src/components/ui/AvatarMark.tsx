export function AvatarMark({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const letter = (name.trim().charAt(0) || "М").toUpperCase();
  const box = size === "lg" ? "h-16 w-16 text-2xl" : "h-12 w-12 text-xl";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-primary font-display font-extrabold text-on-primary ${box}`}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}
