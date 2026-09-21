import { forwardRef, type TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { label, id, className = "", ...props },
  ref,
) {
  const inputId = id ?? props.name;
  return (
    <label className="block space-y-1.5" htmlFor={inputId}>
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <textarea
        id={inputId}
        ref={ref}
        className={`w-full resize-y rounded-none border-2 border-border bg-transparent px-3 py-2.5 text-base leading-relaxed text-foreground outline-none transition duration-150 placeholder:text-muted-foreground/70 focus:border-primary focus:ring-0 ${className}`}
        {...props}
      />
    </label>
  );
});
