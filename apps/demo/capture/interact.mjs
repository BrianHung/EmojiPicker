// Behavior checks the screenshots can't see: skin tone control, tokens on gallery pieces.
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));

// 1. Skin tone: open, keyboard, pick; the grid's hand emoji follows.
await p.goto("http://localhost:5199/shot.html?skin=discord&theme=dark");
await p.locator('[data-slot="emoji"]').first().waitFor();
const trigger = p.locator('[data-slot="skin-tone"] > button').first();
const before = await trigger.getAttribute("aria-label");
await trigger.click();
const options = p.locator('[data-slot="skin-tone-option"]');
const count = await options.count();
const focused = await p.evaluate(() => document.activeElement?.getAttribute("aria-label"));
await p.keyboard.press("ArrowRight");
const afterArrow = await p.evaluate(() => document.activeElement?.getAttribute("aria-label"));
await options.nth(3).click();
const after = await trigger.getAttribute("aria-label");
const open = await p.locator('[data-slot="skin-tone-options"]').count();
await p.fill('[data-slot="search-input"]', "thumbs up");
await p.waitForTimeout(400);
const thumb = await p.locator('[data-slot="emoji"]').first().getAttribute("data-unified");
await trigger.click();
await p.mouse.click(5, 5);
const closedOnOutside = (await p.locator('[data-slot="skin-tone-options"]').count()) === 0;
console.log({ before, options: count, focusedOnOpen: focused, afterArrow, after, closedAfterPick: open === 0, firstResult: thumb, closedOnOutside });

// 2. Gallery: Slack's pieces resolve Slack tokens, not the library defaults.
await p.goto("http://localhost:5199/#examples");
await p.getByRole("tab", { name: "Slack" }).click();
await p.waitForTimeout(500);
const tokens = await p.evaluate(() => {
  const read = (sel, prop = "background-color") => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[prop === "background-color" ? "backgroundColor" : prop] : "missing"; };
  return {
    picker: read('#examples [data-slot="emoji-picker"][data-skin="slack"]'),
    tapback: read('#examples [role="toolbar"][data-skin="slack"]'),
    pill: read('#examples [data-skin="slack"] button[aria-pressed]'),
    pillMine: read('#examples [data-skin="slack"] button[aria-pressed="true"]', "color"),
  };
});
console.log(tokens, errors.length ? errors : "no errors");
await b.close();
