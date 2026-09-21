import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { LogoBadge } from "../Logo";
import { SiteShot } from "../SiteShot";
import { unbounded } from "../fonts";
import { paper, volt } from "../theme";

export function SceneCountry() {
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
      <SiteShot src="shots/03-country.png" dark={0.48} />
      <LogoBadge />
      <div
        style={{
          fontFamily: unbounded,
          fontSize: 22,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: volt,
          opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Страна
      </div>
      <div
        style={{
          marginTop: 16,
          fontFamily: unbounded,
          fontSize: vertical ? 64 : 96,
          fontWeight: 800,
          lineHeight: 0.9,
          textTransform: "uppercase",
          color: paper,
          opacity: interpolate(frame, [0.3 * fps, 1.1 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Вся Беларусь
      </div>
      <div
        style={{
          marginTop: 20,
          fontFamily: unbounded,
          fontSize: vertical ? 32 : 40,
          color: volt,
          textTransform: "uppercase",
        }}
      >
        Все города. Не только области.
      </div>
    </AbsoluteFill>
  );
}
