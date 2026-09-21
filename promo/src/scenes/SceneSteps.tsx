import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { LogoBadge } from "../Logo";
import { SiteShot } from "../SiteShot";
import { onest, unbounded } from "../fonts";
import { paper, shift, volt } from "../theme";

const ITEMS = [
  { n: "01", title: "Точка", text: "Заявка — двор, подъезд, аптека." },
  { n: "02", title: "Смена", text: "Включил — тебя видно. Берёшь рядом." },
  { n: "03", title: "Идут", text: "Чат только у сторон заявки." },
];

export function SceneSteps() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertical = height > width;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        paddingLeft: 80,
        paddingRight: 80,
      }}
    >
      <SiteShot src="shots/04-how.png" dark={0.58} />
      <LogoBadge />
      <div
        style={{
          fontFamily: unbounded,
          fontSize: 22,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: volt,
          marginBottom: 28,
        }}
      >
        Три шага. Без чата в пустоту.
      </div>
      <div style={{ display: "flex", flexDirection: vertical ? "column" : "row", gap: vertical ? 28 : 40 }}>
        {ITEMS.map((item, index) => {
          const start = (0.4 + index * 0.7) * fps;
          return (
            <div
              key={item.n}
              style={{
                flex: 1,
                opacity: interpolate(frame, [start, start + 14], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                }),
                translate: interpolate(frame, [start, start + 16], ["0px 24px", "0px 0px"], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.spring({ damping: 200 }),
                }),
              }}
            >
              <div
                style={{
                  fontFamily: unbounded,
                  fontSize: 20,
                  color: index === 1 ? shift : volt,
                }}
              >
                {item.n}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: unbounded,
                  fontSize: vertical ? 48 : 64,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  color: paper,
                  lineHeight: 1,
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  marginTop: 14,
                  fontFamily: onest,
                  fontSize: 28,
                  color: paper,
                  opacity: 0.72,
                  maxWidth: 360,
                }}
              >
                {item.text}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
