import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseFile } from "music-metadata";
import { EdgeTTS } from "node-edge-tts";

const FPS = 30;
const FADE = 12;
const PAD_SEC = 0.55;
const OUT = join(process.cwd(), "public", "voiceover");

const SCENES = [
  {
    id: "01-hook",
    text: "Мовай. Читается мовай. Мова дапамогі — речь помощи по всей Беларуси.",
  },
  {
    id: "02-problem",
    text: "Это не лента объявлений и не чат в пустоту. Заявка — точка на карте: двор, подъезд, аптека.",
  },
  {
    id: "03-steps",
    text: "Три шага. Ставите заявку. Кто включил смену рядом — берёт. И идёт к вам. Чат только у сторон этой заявки.",
  },
  {
    id: "04-country",
    text: "Вся Беларусь. Любой город. Не только области.",
  },
  {
    id: "05-cta",
    text: "Нужна помощь — поставьте точку. Канал проекта в телеграм: мовай би вай.",
  },
];

mkdirSync(OUT, { recursive: true });

const tts = new EdgeTTS({
  voice: "ru-RU-DmitryNeural",
  lang: "ru-RU",
  saveSubtitles: true,
  rate: "-8%",
  timeout: 25000,
});

const frames = [];
const captions = [];
let composedFrame = 0;

for (let i = 0; i < SCENES.length; i++) {
  const scene = SCENES[i];
  const file = join(OUT, `${scene.id}.mp3`);
  await tts.ttsPromise(scene.text, file);
  const meta = await parseFile(file);
  const sec = meta.format.duration ?? 4;
  const sceneFrames = Math.max(90, Math.ceil((sec + PAD_SEC) * FPS));
  frames.push({ id: scene.id, file: `voiceover/${scene.id}.mp3`, sec, frames: sceneFrames });

  let subs = [];
  try {
    subs = JSON.parse(readFileSync(`${file}.json`, "utf8"));
  } catch {
    subs = [{ part: scene.text, start: 0, end: sec }];
  }

  const sceneStartMs = (composedFrame / FPS) * 1000;
  for (const line of subs) {
    const words = String(line.part).split(/(\s+)/).filter(Boolean);
    const span = Math.max(1, (line.end - line.start) * 1000);
    let cursor = 0;
    for (const word of words) {
      if (/^\s+$/.test(word)) {
        continue;
      }
      const dur = Math.max(180, (word.length / Math.max(1, line.part.replace(/\s+/g, "").length)) * span);
      const startMs = Math.round(sceneStartMs + line.start * 1000 + cursor);
      captions.push({
        text: captions.length === 0 || word.startsWith(" ") ? word : ` ${word}`,
        startMs,
        endMs: Math.round(startMs + dur),
        timestampMs: startMs,
        confidence: 1,
      });
      cursor += dur;
    }
  }

  composedFrame += sceneFrames - (i === SCENES.length - 1 ? 0 : FADE);
  console.log("wrote", scene.id, `${sec.toFixed(2)}s`, `${sceneFrames}f`);
}

const totalFrames = frames.reduce((sum, item) => sum + item.frames, 0) - FADE * (frames.length - 1);
const meta = { fps: FPS, fade: FADE, totalFrames, scenes: frames };
writeFileSync(join(OUT, "meta.json"), JSON.stringify(meta, null, 2));
writeFileSync(join(process.cwd(), "public", "captions.json"), JSON.stringify(captions, null, 2));
console.log("total", totalFrames);
