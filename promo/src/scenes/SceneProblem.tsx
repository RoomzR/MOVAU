import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { LogoBadge } from "../Logo";
import { SiteShot } from "../SiteShot";
import { onest, unbounded } from "../fonts";
import { mute, paper, volt } from "../theme";

export function SceneProblem() {
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
      <SiteShot src="shots/06-requests.png" dark={0.52} />
      <LogoBadge />
      <div
        style={{
          fontFamily: onest,
          fontSize: vertical ? 36 : 44,
          fontWeight: 600,
          color: mute,
          textDecoration: "line-through",
          textDecorationColor: "#5a1f1f",
          opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Кто поможет? Пишите в лс
      </div>
      <div
        style={{
          marginTop: 28,
          fontFamily: unbounded,
          fontSize: vertical ? 56 : 84,
          fontWeight: 800,
          lineHeight: 0.95,
          textTransform: "uppercase",
          color: paper,
          opacity: interpolate(frame, [0.6 * fps, 1.4 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Не лента.
        <span style={{ display: "block", color: volt }}>Точка на карте.</span>
      </div>
    </AbsoluteFill>
  );
}
