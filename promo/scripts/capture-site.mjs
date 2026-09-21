import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { ensureBrowser } from "@remotion/renderer";
import puppeteer from "puppeteer-core";

const require = createRequire(import.meta.url);
const { getLocalBrowserExecutable } = require("@remotion/renderer/dist/get-local-browser-executable.js");

const OUT = join(process.cwd(), "public", "shots");
const URL = process.env.MOVAU_URL ?? "http://127.0.0.1:5173";

mkdirSync(OUT, { recursive: true });
await ensureBrowser();
const executablePath = getLocalBrowserExecutable({
  preferredBrowserExecutable: null,
  logLevel: "info",
  indent: false,
  chromeMode: "headless-shell",
});

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox", "--hide-scrollbars", "--window-size=1920,1080"],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
page.setDefaultTimeout(40000);

async function shot(name) {
  const file = join(OUT, `${name}.png`);
  await page.screenshot({ path: file, type: "png" });
  console.log("shot", name);
}

try {
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 2500));
  await shot("01-nearby");

  for (const name of ["02-system", "03-country", "04-how", "05-shift"]) {
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    await new Promise((r) => setTimeout(r, 1400));
    await shot(name);
  }

  await page.goto(`${URL}/requests`, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => null);
  await new Promise((r) => setTimeout(r, 1800));
  await shot("06-requests");
} finally {
  await browser.close();
}
