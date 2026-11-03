// Screenshots each example alone at 2x: node demo/capture/shoot.mjs [style...] [--theme=dark]
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const BASE = process.env.BASE ?? "http://localhost:5199";
const args = process.argv.slice(2);
const theme = args.find((a) => a.startsWith("--theme="))?.slice(8) ?? "light";
const styles = args.filter((a) => !a.startsWith("--"));
const out = fileURLToPath(new URL("./out/", import.meta.url));
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
for (const style of styles.length ? styles : ["apple", "slack", "discord", "notion", "linear", "instagram"]) {
  // A fresh context per example: frequents live in localStorage and must not leak between shots.
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 800, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.error("pageerror", e.message));
  await page.goto(`${BASE}/shot.html?style=${style}&theme=${theme}`);
  const el = page.locator(`[data-shot=${style}]`);
  await el.locator('[data-epr-part="emoji"]').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const file = `${out}${style}-${theme}.png`;
  await el.screenshot({ path: file });
  const box = await el.boundingBox();
  console.log(style, theme, `${box.width}x${box.height}`, file);
  await context.close();
}
await browser.close();
