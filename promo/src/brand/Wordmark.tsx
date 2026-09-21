import { Img, staticFile } from "remotion";

const RATIO = 242 / 893;

type Tone = "paper" | "ink";

export function Wordmark({ width, tone = "paper" }: { width: number; tone?: Tone }) {
  return (
    <Img
      src={staticFile("logo-alpha.png")}
      style={{
        width,
        height: width * RATIO,
        display: "block",
        objectFit: "contain",
        flexShrink: 0,
        filter: tone === "ink" ? "brightness(0)" : undefined,
      }}
    />
  );
}
