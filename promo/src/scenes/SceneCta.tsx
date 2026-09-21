import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { Logo } from "../Logo";
import { SiteShot } from "../SiteShot";
import { unbounded } from "../fonts";
import { ink, mute, paper, volt } from "../theme";

export function SceneCta() {
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
      <SiteShot src="shots/05-shift.png" dark={0.62} />
      <div
        style={{
          opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <Logo width={vertical ? 280 : 360} />
      </div>
      <div
        style={{
          marginTop: 18,
          fontFamily: unbounded,
          fontSize: vertical ? 56 : 88,
          fontWeight: 800,
          lineHeight: 0.92,
          textTransform: "uppercase",
          color: paper,
          opacity: interpolate(frame, [0.3 * fps, 1.1 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Нужна помощь —
        <span style={{ display: "block", color: volt }}>поставьте точку.</span>
      </div>
      <div
        style={{
          marginTop: 36,
          display: "inline-flex",
          alignItems: "center",
          minHeight: 64,
          paddingLeft: 28,
          paddingRight: 28,
          backgroundColor: volt,
          color: ink,
          fontFamily: unbounded,
          fontSize: vertical ? 28 : 36,
          fontWeight: 800,
          textTransform: "uppercase",
          opacity: interpolate(frame, [1.2 * fps, 2 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        t.me/MOVAUBY
      </div>
      <div
        style={{
          marginTop: 22,
          fontFamily: unbounded,
          fontSize: 20,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: mute,
        }}
      >
        Взаимная помощь · вся Беларусь
      </div>
    </AbsoluteFill>
  );
}
