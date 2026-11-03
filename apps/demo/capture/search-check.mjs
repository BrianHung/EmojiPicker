// Search results behavior: ranked order, highlight, keyboard, preview, grouped, empty.
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome", headless: true });
const page = await b.newPage({ deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const glyphs = () => page.evaluate(() => [...document.querySelectorAll('[data-results] [data-slot="emoji"]')].slice(0, 9).map((c) => c.textContent || c.querySelector("img")?.getAttribute("src")?.split("/").pop()).join(" "));
const highlighted = () => page.evaluate(() => document.querySelector('[data-results] [data-highlighted]')?.getAttribute("aria-label"));

await page.goto("http://localhost:5199/shot.html?skin=discord&theme=dark");
await page.locator('[data-slot="emoji"]').first().waitFor();
for (const q of ["heart", "fire", "thu", "rokcet", "hart"]) {
  await page.fill('[data-slot="search-input"]', q);
  await page.waitForTimeout(250);
  console.log(q.padEnd(7), (await glyphs()).slice(0, 60).padEnd(30), "| highlighted:", await highlighted(), "| preview:", await page.evaluate(() => document.querySelector('[data-skin] .truncate')?.textContent));
}
await page.fill('[data-slot="search-input"]', "heart");
await page.waitForTimeout(250);
await page.keyboard.press("ArrowDown");
const afterDown = await highlighted();
await page.keyboard.press("ArrowRight");
const afterRight = await highlighted();
await page.keyboard.press("Enter");
const picked = await page.evaluate(() => (window.picked ?? []).map((s) => `${s.emoji} ${s.shortcode}`));
console.log({ afterDown, afterRight, picked });
await page.fill('[data-slot="search-input"]', "zzqqxx");
await page.waitForTimeout(250);
console.log("empty:", await page.evaluate(() => document.querySelector('[data-slot="empty"]')?.textContent), "| cells:", await page.locator('[data-results] [data-slot="emoji"]').count());
await page.fill('[data-slot="search-input"]', "");
await page.waitForTimeout(250);
console.log("cleared → category list back:", await page.locator('[data-results]').count() === 0, await page.locator('[data-slot="emoji"]').count() > 0);

await page.goto("http://localhost:5199/shot.html?skin=slack&results=grouped");
await page.locator('[data-slot="emoji"]').first().waitFor();
await page.fill('[data-slot="search-input"]', "heart");
await page.waitForTimeout(250);
console.log("grouped sections:", await page.evaluate(() => [...document.querySelectorAll('[data-results="grouped"] [data-slot="category-header"]')].map((h) => `${h.textContent} (${h.parentElement.querySelectorAll('[data-slot="emoji"]').length})`).join(", ")));
await page.screenshot({ path: "out/search-grouped-slack.png", clip: await page.locator("[data-shot]").boundingBox() });
await page.goto("http://localhost:5199/shot.html?skin=slack");
await page.locator('[data-slot="emoji"]').first().waitFor();
await page.fill('[data-slot="search-input"]', "heart");
await page.waitForTimeout(250);
await page.screenshot({ path: "out/search-ranked-slack.png", clip: await page.locator("[data-shot]").boundingBox() });
console.log(errors.length ? errors : "no errors");
await b.close();
