import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FPS = 30;
const FADE = 12;
const meta = JSON.parse(readFileSync(join("public", "voiceover", "meta.json"), "utf8"));
const captions = [];
let composedFrame = 0;

for (let i = 0; i < meta.scenes.length; i++) {
  const scene = meta.scenes[i];
  const cues = JSON.parse(readFileSync(join("public", `${scene.file}.json`), "utf8"));
  const sceneStartMs = (composedFrame / FPS) * 1000;
  for (const line of cues) {
    const text = String(line.part).trim();
    if (!text) continue;
    captions.push({
      text: captions.length === 0 ? text : ` ${text}`,
      startMs: Math.round(sceneStartMs + line.start),
      endMs: Math.round(sceneStartMs + line.end),
      timestampMs: Math.round(sceneStartMs + line.start),
      confidence: 1,
    });
  }
  composedFrame += scene.frames - (i === meta.scenes.length - 1 ? 0 : FADE);
}

writeFileSync(join("public", "captions.json"), JSON.stringify(captions, null, 2));
console.log("captions", captions.length, "endMs", captions.at(-1)?.endMs);
