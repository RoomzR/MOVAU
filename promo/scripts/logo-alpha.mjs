import { createReadStream, createWriteStream } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "public", "logo.png");
const dest = join(root, "public", "logo-alpha.png");

createReadStream(src)
  .pipe(new PNG())
  .on("parsed", function parsed() {
    for (let i = 0; i < this.data.length; i += 4) {
      const lum = (this.data[i] + this.data[i + 1] + this.data[i + 2]) / 3;
      this.data[i] = 255;
      this.data[i + 1] = 255;
      this.data[i + 2] = 255;
      this.data[i + 3] = lum < 10 ? 0 : Math.round(lum);
    }
    this.pack().pipe(createWriteStream(dest)).on("finish", () => {
      console.log(`logo-alpha ${this.width}x${this.height}`);
    });
  });
