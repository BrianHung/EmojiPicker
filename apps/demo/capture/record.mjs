// Same steps as the real-app recording: open, type a query one letter at a time, hover a cell.
// node record.mjs discord heart 10 --theme=dark  → frames/<style>/ours-N.png
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const theme = args.find((a) => a.startsWith("--theme="))?.slice(8) ?? "light";
const [style, query = "heart", hoverIndex = "10"] = args.filter((a) => !a.startsWith("--"));
const dir = fileURLToPath(new URL(`./frames/${style}/`, import.meta.url));
await mkdir(dir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 800, height: 900 } });
await page.goto(`http://localhost:5199/shot.html?style=${style}&theme=${theme}`);
const el = page.locator(`[data-shot=${style}]`);
await el.locator('[data-epr-part="emoji"]').first().waitFor();
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
let n = 0;
const shot = async () => {
  await page.waitForTimeout(250);
  await el.screenshot({ path: `${dir}ours-${n++}.png` });
};
await shot();
for (const ch of query) {
  await page.keyboard.type(ch);
  await shot();
}
await el.locator('[data-epr-part="emoji"]').nth(Number(hoverIndex)).hover();
await shot();
await browser.close();
console.log(`${n} frames → ${dir}`);
