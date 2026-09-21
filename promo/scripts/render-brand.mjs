import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { PNG } from "pngjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "out", "brand");
mkdirSync(outDir, { recursive: true });

const alpha = PNG.sync.read(readFileSync(join(root, "public", "logo-alpha.png")));
writeFileSync(join(outDir, "wordmark-white.png"), PNG.sync.write(alpha));
const black = new PNG({ width: alpha.width, height: alpha.height });
for (let i = 0; i < alpha.data.length; i += 4) {
  black.data[i] = 0;
  black.data[i + 1] = 0;
  black.data[i + 2] = 0;
  black.data[i + 3] = alpha.data[i + 3];
}
writeFileSync(join(outDir, "wordmark-black.png"), PNG.sync.write(black));
console.log("wordmarks");

const specs = [
  ["AvatarInk", "avatar-ink-800.png"],
  ["AvatarVolt", "avatar-volt-800.png"],
  ["AvatarShift", "avatar-shift-800.png"],
  ["AvatarInk512", "avatar-ink-512.png"],
  ["BannerTelegram", "banner-telegram-1280x720.png"],
  ["BannerYoutube", "banner-youtube-2560x1440.png"],
  ["ShareOg", "share-og-1200x630.png"],
  ["CoverVk", "cover-vk-1590x400.png"],
  ["CoverX", "cover-x-1500x500.png"],
  ["AdHelpWide", "ad-help-1920x1080.png"],
  ["AdHelpSquare", "ad-help-1080x1080.png"],
  ["AdShiftSquare", "ad-shift-1080x1080.png"],
  ["AdMapSquare", "ad-map-1080x1080.png"],
  ["StoryHelp", "story-help-1080x1920.png"],
  ["StoryShift", "story-shift-1080x1920.png"],
  ["StoryLogo", "story-logo-1080x1920.png"],
];

for (const [id, file] of specs) {
  const dest = join(outDir, file);
  console.log(`→ ${file}`);
  execFileSync("npx", ["remotion", "still", id, dest, "--image-format", "png", "--frame", "0"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
}

console.log(`готово: ${outDir}`);
