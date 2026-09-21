import { createReadStream, createWriteStream, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { PNG } from "pngjs";

const src = process.argv[2];
const dest = process.argv[3];
if (!src || !dest) {
  throw new Error("usage: node crop-logo.mjs <src> <dest>");
}

mkdirSync(dirname(dest), { recursive: true });

createReadStream(src)
  .pipe(new PNG())
  .on("parsed", function onParsed() {
    const { width, height, data } = this;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (width * y + x) << 2;
        const lum = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
        if (lum > 28) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    const padX = Math.max(8, Math.round((maxX - minX) * 0.05));
    const padY = Math.max(14, Math.round((maxY - minY) * 0.22));
    const x0 = Math.max(0, minX - padX);
    const y0 = Math.max(0, minY - padY);
    const x1 = Math.min(width - 1, maxX + padX);
    const y1 = Math.min(height - 1, maxY + padY);
    const cw = x1 - x0 + 1;
    const ch = y1 - y0 + 1;
    const out = new PNG({ width: cw, height: ch });
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const si = (width * (y0 + y) + (x0 + x)) << 2;
        const di = (cw * y + x) << 2;
        const lum = 0.3 * data[si] + 0.59 * data[si + 1] + 0.11 * data[si + 2];
        if (lum < 22) {
          out.data[di] = 0;
          out.data[di + 1] = 0;
          out.data[di + 2] = 0;
          out.data[di + 3] = 0;
        } else {
          out.data[di] = 255;
          out.data[di + 1] = 255;
          out.data[di + 2] = 255;
          out.data[di + 3] = Math.min(255, Math.round((lum - 18) * 1.2));
        }
      }
    }
    out.pack().pipe(createWriteStream(dest)).on("finish", () => {
      console.log(`cropped ${width}x${height} -> ${cw}x${ch}`);
    });
  });
