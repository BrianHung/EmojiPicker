import { chromium } from "playwright";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = (n) => `${here}/out/imessage27-flow-${n}.png`;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const watch = (page, tag) => {
  page.on("pageerror", (e) => errors.push(`${tag}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${tag}: ${m.text()} ${m.location().url}`));
};

{
  const ctx = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 520, height: 980 } });
  const page = await ctx.newPage();
  watch(page, "frame");
  await page.goto("http://localhost:5199/shot.html?view=frame&scale=1&anim=1");
  await page.waitForTimeout(800);
  await page.screenshot({ path: out("0-frame") });
  await page.waitForSelector('[role="toolbar"]');
  await page.screenshot({ path: out("1-pill") });
  await page.locator('[aria-label="More emoji"]').first().click();
  await page.waitForSelector("[data-emoji-keyboard] [data-slot=emoji]");
  await page.waitForTimeout(700);
  await page.screenshot({ path: out("2-sheet") });
  await page.locator("[data-emoji-keyboard] [data-slot=emoji]").nth(3).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: out("3-reacted") });
  const sheetGone = (await page.locator("[data-emoji-keyboard]").count()) === 0;
  await page.locator('[data-imessage] [role="button"]').first().click({ button: "right" });
  await page.waitForSelector('[role="menu"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: out("4-menu") });
  await page.locator('[role="menu"] [aria-label="Like"]').click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: out("4-like") });
  const b = await page.locator('[data-imessage] [role="button"]').nth(1).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(600);
  const longPress = (await page.locator('[role="toolbar"]').count()) > 0;
  await page.mouse.up();
  await page.screenshot({ path: out("5-longpress") });
  await page.mouse.click(260, 300);
  await page.waitForTimeout(500);
  const plus = page.getByRole("button", { name: "Emoji", exact: true });
  await plus.click();
  await page.waitForSelector("[data-emoji-keyboard] [data-slot=emoji]");
  await page.waitForTimeout(600);
  const keys = page.locator("[data-emoji-keyboard] [data-slot=emoji]");
  await keys.nth(0).click();
  await keys.nth(1).click();
  await keys.nth(2).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: out("6-compose") });
  const composed = await page.locator('[aria-label="Message"]').inputValue();
  await plus.click();
  await page.waitForTimeout(600);
  const composeClosed = (await page.locator("[data-emoji-keyboard]").count()) === 0;
  console.log({ sheetGone, longPress, composed, composeClosed });
  await ctx.close();
}

{
  const ctx = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 402, height: 874 } });
  const page = await ctx.newPage();
  watch(page, "incoming");
  await page.goto("http://localhost:5199/shot.html?view=imessage27&state=reacted&anim=1");
  await page.locator('[data-imessage] [role="button"]').first().waitFor();
  await page.waitForTimeout(400);
  await page.locator('input[aria-label="Message"]').fill("hello there");
  await page.keyboard.press("Enter");
  const t0 = Date.now();
  const seen = {};
  for (const t of [600, 1450, 2300, 2650, 3400]) {
    await page.waitForTimeout(Math.max(0, t - (Date.now() - t0)));
    seen[t] = await page.locator('[aria-label="Reaction received"]').count();
    await page.screenshot({ path: out(`7-incoming-${t}`) });
  }
  const mine = page.locator('[data-imessage] [role="button"]').last();
  await mine.click({ button: "right" });
  await page.waitForSelector('[role="menu"]');
  await page.waitForTimeout(500);
  await page.locator('[role="menu"] [aria-label="Heart"]').click();
  await page.waitForTimeout(600);
  await mine.dblclick();
  await page.waitForSelector('[role="toolbar"]');
  await page.waitForTimeout(700);
  await page.screenshot({ path: out("8-pill-selected") });
  const selected = await page.locator('[role="toolbar"] [aria-pressed="true"]').getAttribute("aria-label");
  await page.locator('[role="toolbar"] [aria-pressed="true"]').click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: out("9-removed") });
  const badges = await page.evaluate(() => document.querySelectorAll("[data-imessage] [role=button] svg circle").length);
  console.log({ cardSeenAt: seen, selected, badgeCirclesAfterRemove: badges });
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  watch(page, "home");
  await page.goto("http://localhost:5199/");
  await page.waitForTimeout(2500);
  const hero = page.locator("[data-iphone-frame]").first();
  if (await hero.count()) await hero.screenshot({ path: out("home-hero") });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.waitForTimeout(300);
  if (await hero.count()) await hero.screenshot({ path: out("home-hero-dark") });
  await ctx.close();
}
await browser.close();
console.log(errors.length ? errors.join("\n") : "no console errors");
