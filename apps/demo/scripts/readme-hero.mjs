import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { preview } from "vite";

process.env.E2E_BUILD = "1";
const root = fileURLToPath(new URL("../", import.meta.url));
const out = (scheme) => fileURLToPath(new URL(`../../../.github/assets/picker-${scheme}.png`, import.meta.url));
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
  await picker.locator('[data-slot="emoji-picker-emoji"]').nth(13).hover();
  await page.waitForFunction(() => document.fonts.ready.then(() => [...document.fonts].every((f) => f.status !== "loading")));
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await sharp(await picker.screenshot({ omitBackground: true, animations: "disabled" }))
    .png({ palette: true, quality: 90, effort: 10, compressionLevel: 9 })
    .toFile(out(colorScheme));
  console.log(out(colorScheme), statSync(out(colorScheme)).size);
  await page.close();
}

await browser.close();
await server.close();
