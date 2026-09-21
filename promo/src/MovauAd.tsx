import { Audio } from "@remotion/media";
import { useCallback, useEffect, useState } from "react";
import type { Caption } from "@remotion/captions";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill, Sequence, staticFile, useDelayRender } from "remotion";

import { CaptionsOverlay } from "./CaptionsOverlay";
import { SceneCountry } from "./scenes/SceneCountry";
import { SceneCta } from "./scenes/SceneCta";
import { SceneHook } from "./scenes/SceneHook";
import { SceneProblem } from "./scenes/SceneProblem";
import { SceneSteps } from "./scenes/SceneSteps";
import { ink } from "./theme";
import { COUNTRY, CTA, FADE, HOOK, PROBLEM, STEPS, VOICEOVER } from "./timing";

const fadeTiming = linearTiming({ durationInFrames: FADE });
const SCENE_FRAMES = [HOOK, PROBLEM, STEPS, COUNTRY, CTA];

export function MovauAd() {
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("captions"));

  const load = useCallback(async () => {
    try {
      const response = await fetch(staticFile("captions.json"));
      const data = (await response.json()) as Caption[];
      setCaptions(data);
      continueRender(handle);
    } catch (error) {
      cancelRender(error);
    }
  }, [cancelRender, continueRender, handle]);

  useEffect(() => {
    void load();
  }, [load]);

  let from = 0;
  const voice = VOICEOVER.map((file, index) => {
    const start = from;
    from += SCENE_FRAMES[index] - (index === VOICEOVER.length - 1 ? 0 : FADE);
    return (
      <Sequence key={file} from={start} durationInFrames={SCENE_FRAMES[index]}>
        <Audio src={staticFile(file)} />
      </Sequence>
    );
  });

  return (
    <AbsoluteFill style={{ backgroundColor: ink }}>
      {voice}
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={HOOK} name="Hook">
          <SceneHook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />
        <TransitionSeries.Sequence durationInFrames={PROBLEM} name="Problem">
          <SceneProblem />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />
        <TransitionSeries.Sequence durationInFrames={STEPS} name="Steps">
          <SceneSteps />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />
        <TransitionSeries.Sequence durationInFrames={COUNTRY} name="Country">
          <SceneCountry />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />
        <TransitionSeries.Sequence durationInFrames={CTA} name="Cta">
          <SceneCta />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      {captions ? <CaptionsOverlay captions={captions} /> : null}
    </AbsoluteFill>
  );
}
