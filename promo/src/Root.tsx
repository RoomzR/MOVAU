import { Composition, Folder } from "remotion";

import { BrandKit } from "./brand/BrandKit";
import { BRAND_SPECS } from "./brand/specs";
import { MovauAd } from "./MovauAd";
import { SceneCountry } from "./scenes/SceneCountry";
import { SceneCta } from "./scenes/SceneCta";
import { SceneHook } from "./scenes/SceneHook";
import { SceneProblem } from "./scenes/SceneProblem";
import { SceneSteps } from "./scenes/SceneSteps";
import { COUNTRY, CTA, DURATION, FPS, HOOK, PROBLEM, STEPS } from "./timing";

export const Root = () => {
  return (
    <>
      <Composition
        id="MovauAd"
        component={MovauAd}
        durationInFrames={DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="MovauAdStory"
        component={MovauAd}
        durationInFrames={DURATION}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Folder name="Brand">
        {BRAND_SPECS.map((spec) => (
          <Composition
            key={spec.id}
            id={spec.id}
            component={BrandKit}
            durationInFrames={1}
            fps={30}
            width={spec.width}
            height={spec.height}
            defaultProps={{ variant: spec.variant }}
          />
        ))}
      </Folder>
      <Folder name="Scenes">
        <Composition id="SceneHook" component={SceneHook} durationInFrames={HOOK} fps={FPS} width={1920} height={1080} />
        <Composition
          id="SceneProblem"
          component={SceneProblem}
          durationInFrames={PROBLEM}
          fps={FPS}
          width={1920}
          height={1080}
        />
        <Composition id="SceneSteps" component={SceneSteps} durationInFrames={STEPS} fps={FPS} width={1920} height={1080} />
        <Composition
          id="SceneCountry"
          component={SceneCountry}
          durationInFrames={COUNTRY}
          fps={FPS}
          width={1920}
          height={1080}
        />
        <Composition id="SceneCta" component={SceneCta} durationInFrames={CTA} fps={FPS} width={1920} height={1080} />
      </Folder>
    </>
  );
};
