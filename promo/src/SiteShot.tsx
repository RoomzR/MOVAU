import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

type Props = {
  src: string;
  dark?: number;
};

export function SiteShot({ src, dark = 0.45 }: Props) {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#08090C" }}>
      <Img
        src={staticFile(src)}
        style={{
          width,
          height,
          objectFit: "cover",
          objectPosition: "center",
          scale: interpolate(frame, [0, durationInFrames], [1, 1.08], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            output: "perceptual-scale",
          }),
        }}
      />
      <AbsoluteFill style={{ backgroundColor: `rgba(8, 9, 12, ${dark})` }} />
    </AbsoluteFill>
  );
}
