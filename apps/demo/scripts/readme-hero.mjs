import { execFileSync } from "node:child_process";
import { statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { preview } from "vite";

process.env.E2E_BUILD = "1";
const root = fileURLToPath(new URL("../", import.meta.url));
const out = fileURLToPath(new URL("../../../.github/assets/picker.svg", import.meta.url));
const GAP = 24;
const PAD = 32;
const BACKGROUND = "#a1a1aa";
const shots = [];
const port = Number(process.env.E2E_PORT) || 5661;

execFileSync("npx", ["vite", "build"], { cwd: root, stdio: "inherit" });
const server = await preview({ root, preview: { port, strictPort: true } });
const browser = await chromium.launch();

for (const colorScheme of ["light", "dark"]) {
  const page = await browser.newPage({ viewport: { width: 480, height: 480 }, deviceScaleFactor: 2, colorScheme });
  await page.goto(`http://localhost:${port}/e2e/pages/hero/`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "html, body { background: transparent !important }" });
  await page.waitForFunction(() => document.fonts.ready.then(() => [...document.fonts].every((f) => f.status !== "loading")));
  const picker = page.locator('[data-slot="emoji-picker"]');
  await picker.locator('[data-slot="emoji-picker-list-cell"]').nth(18).hover();
  await page.waitForFunction(() => document.fonts.ready.then(() => [...document.fonts].every((f) => f.status !== "loading")));
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const png = await sharp(await picker.screenshot({ omitBackground: true, animations: "disabled" }))
    .png({ palette: true, quality: 90, effort: 10, compressionLevel: 9 })
    .toBuffer({ resolveWithObject: true });
  shots.push(png);
  await page.close();
}

await browser.close();
await server.close();

const width = (shots[0].info.width + shots[1].info.width) / 2 + GAP + PAD * 2;
const height = Math.max(...shots.map((s) => s.info.height)) / 2 + PAD * 2;
const images = shots.map((s, i) => `<image x="${PAD + i * (shots[0].info.width / 2 + GAP)}" y="${PAD}" width="${s.info.width / 2}" height="${s.info.height / 2}" href="data:image/png;base64,${s.data.toString("base64")}"/>`);
writeFileSync(
  out,
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>Emoji picker in light and dark mode</title><rect width="${width}" height="${height}" rx="16" fill="${BACKGROUND}"/>${images.join("")}</svg>\n`,
);
console.log(out, statSync(out).size);
