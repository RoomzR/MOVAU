import { unbounded } from "../fonts";
import { ink, volt } from "../theme";

export function CtaPill({ label, fontSize }: { label: string; fontSize: number }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: Math.round(fontSize * 2.1),
        paddingLeft: Math.round(fontSize * 0.9),
        paddingRight: Math.round(fontSize * 0.9),
        backgroundColor: volt,
        color: ink,
        fontFamily: unbounded,
        fontSize,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </div>
  );
}
