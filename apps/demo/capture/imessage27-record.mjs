// Records our iOS 27 flow (KB fixture, real animations) at 402×874 (1 px = 1 pt) to compare
// timing with ref/imessage27-recording.mp4: double-click → pill, smiley → sheet, pick → reaction.
//   node capture/imessage27-record.mjs   → out/imessage27-ours.webm
import { chromium } from "playwright";
import { renameSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, recordVideo: { dir: `${here}/out/video`, size: { width: 402, height: 874 } } });
const page = await ctx.newPage();
await page.goto("http://localhost:5199/shot.html?view=imessage27&state=idle&anim=1");
await page.waitForSelector('[data-imessage] [role="button"]');
await page.waitForTimeout(1200);
await page.locator('[data-imessage] [role="button"]').first().dblclick();
await page.waitForTimeout(1500);
await page.locator('[role="toolbar"]').evaluate((el) => el.scrollTo({ left: 260, behavior: "smooth" }));
await page.waitForTimeout(1200);
await page.locator('[aria-label="More emoji"]').first().click();
await page.waitForTimeout(1800);
await page.locator("[data-emoji-keyboard] button[aria-label]").nth(1).click();
await page.waitForTimeout(1800);
const video = page.video();
await ctx.close();
renameSync(await video.path(), `${here}/out/imessage27-ours.webm`);
await browser.close();
console.log("out/imessage27-ours.webm");
