import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { Logo } from "../Logo";
import { SiteShot } from "../SiteShot";
import { unbounded } from "../fonts";
import { mute, volt } from "../theme";

export function SceneHook() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertical = height > width;
  const logoW = vertical ? width - 160 : Math.min(1100, width - 200);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: 80,
        paddingRight: 80,
      }}
    >
      <SiteShot src="shots/01-nearby.png" dark={0.72} />
      <div
        style={{
          fontFamily: unbounded,
          fontSize: vertical ? 22 : 26,
          fontWeight: 800,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: volt,
          opacity: interpolate(frame, [0, 0.6 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Мова дапамогі
      </div>
      <div
        style={{
          marginTop: 28,
          opacity: interpolate(frame, [0.2 * fps, 1 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          scale: interpolate(frame, [0.2 * fps, 1.2 * fps], [0.92, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 200 }),
            output: "perceptual-scale",
          }),
        }}
      >
        <Logo width={logoW} />
      </div>
      <div
        style={{
          marginTop: 32,
          fontFamily: unbounded,
          fontSize: vertical ? 32 : 44,
          fontWeight: 800,
          textTransform: "uppercase",
          color: volt,
          opacity: interpolate(frame, [1.1 * fps, 2 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Читается мовай
      </div>
      <div
        style={{
          marginTop: 16,
          fontFamily: unbounded,
          fontSize: 22,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: mute,
          opacity: interpolate(frame, [1.8 * fps, 2.6 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Speak help · Беларусь
      </div>
    </AbsoluteFill>
  );
}
