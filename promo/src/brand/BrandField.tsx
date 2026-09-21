import { AbsoluteFill } from "remotion";

import { ink, line, shift, volt } from "../theme";

type Mood = "volt" | "shift" | "split" | "flat-volt" | "flat-shift";

const DOTS: { x: number; y: number; r: number; c: "volt" | "shift" }[] = [
  { x: 0.78, y: 0.42, r: 7, c: "volt" },
  { x: 0.62, y: 0.58, r: 4, c: "shift" },
  { x: 0.86, y: 0.63, r: 5, c: "shift" },
  { x: 0.7, y: 0.28, r: 4, c: "shift" },
  { x: 0.9, y: 0.36, r: 4, c: "shift" },
  { x: 0.54, y: 0.36, r: 3, c: "volt" },
  { x: 0.83, y: 0.78, r: 4, c: "shift" },
  { x: 0.66, y: 0.74, r: 3, c: "volt" },
];

export function BrandField({ mood = "volt", dots = true }: { mood?: Mood; dots?: boolean }) {
  if (mood === "flat-volt") {
    return <AbsoluteFill style={{ backgroundColor: volt }} />;
  }
  if (mood === "flat-shift") {
    return <AbsoluteFill style={{ backgroundColor: shift }} />;
  }

  const glow = mood === "shift" ? shift : volt;
  const glow2 = mood === "shift" ? volt : shift;

  return (
    <AbsoluteFill style={{ backgroundColor: ink, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          opacity: 0.55,
          backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
          backgroundSize: "72px 72px",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 28% 38%, ${glow}2e, transparent 52%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 82% 70%, ${glow2}18, transparent 46%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "38%",
          height: 1,
          backgroundColor: glow,
          opacity: 0.42,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: "72%",
          width: 1,
          backgroundColor: glow2,
          opacity: 0.5,
        }}
      />
      {dots
        ? DOTS.map((dot, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${dot.x * 100}%`,
                top: `${dot.y * 100}%`,
                width: dot.r * 2,
                height: dot.r * 2,
                marginLeft: -dot.r,
                marginTop: -dot.r,
                borderRadius: 999,
                backgroundColor: dot.c === "volt" ? volt : shift,
                boxShadow: dot.c === "volt" ? `0 0 18px ${volt}` : `0 0 12px ${shift}`,
              }}
            />
          ))
        : null}
    </AbsoluteFill>
  );
}
