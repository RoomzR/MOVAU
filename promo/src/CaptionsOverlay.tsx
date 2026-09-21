import { useMemo } from "react";
import type { Caption, TikTokPage } from "@remotion/captions";
import { createTikTokStyleCaptions } from "@remotion/captions";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";

import { onest } from "./fonts";
import { ink, paper, volt } from "./theme";

const SWITCH_MS = 1400;

const CaptionPage = ({ page }: { page: TikTokPage }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const now = page.startMs + (frame / fps) * 1000;
  const size = width >= 1600 ? 52 : 40;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: width >= 1600 ? 72 : 120,
        paddingLeft: 80,
        paddingRight: 80,
      }}
    >
      <div
        style={{
          fontFamily: onest,
          fontSize: size,
          fontWeight: 700,
          lineHeight: 1.25,
          textAlign: "center",
          whiteSpace: "pre",
          color: paper,
          textShadow: `0 2px 18px ${ink}`,
        }}
      >
        {page.tokens.map((token) => {
          const on = token.fromMs <= now && token.toMs > now;
          return (
            <span key={token.fromMs} style={{ color: on ? volt : paper }}>
              {token.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export function CaptionsOverlay({ captions }: { captions: Caption[] }) {
  const { fps } = useVideoConfig();
  const { pages } = useMemo(
    () =>
      createTikTokStyleCaptions({
        captions,
        combineTokensWithinMilliseconds: SWITCH_MS,
      }),
    [captions],
  );

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {pages.map((page, index) => {
        const next = pages[index + 1];
        const start = (page.startMs / 1000) * fps;
        const end = next ? (next.startMs / 1000) * fps : start + (SWITCH_MS / 1000) * fps;
        const durationInFrames = Math.max(1, end - start);
        return (
          <Sequence key={page.startMs} from={start} durationInFrames={durationInFrames}>
            <CaptionPage page={page} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
