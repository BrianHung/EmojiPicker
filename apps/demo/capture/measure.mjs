import { chromium } from "@playwright/test";
const [style = "slack", theme = "light"] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 800, height: 900 } });
await page.goto(`http://localhost:5199/shot.html?style=${style}&theme=${theme}`);
await page.locator('[data-epr-part="emoji"]').first().waitFor();
await page.evaluate(() => document.fonts.ready);
const data = await page.evaluate(() => {
  const root = document.querySelector("[data-shot]");
  const R = root.getBoundingClientRect();
  const box = (e) => {
    const r = e.getBoundingClientRect(),
      s = getComputedStyle(e);
    return { x: +(r.x - R.x).toFixed(1), y: +(r.y - R.y).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), font: `${s.fontSize} ${s.fontWeight} ${s.fontFamily.slice(0, 24)}`, color: s.color, pad: s.padding };
  };
  const parts = {};
  for (const e of root.querySelectorAll("[data-epr-part]")) {
    const k = e.getAttribute("data-epr-part");
    (parts[k] ??= []).length < 3 && parts[k].push(box(e));
  }
  const ems = [...root.querySelectorAll('[data-epr-part="emoji"]')].slice(0, 11).map((e) => {
    const b = box(e);
    return [b.x, b.y, b.w, b.h, b.font];
  });
  return { root: [R.width, R.height], parts: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, v])), ems, input: box(root.querySelector("input")) };
});
console.log(JSON.stringify(data, null, 1).replace(/\n\s+(?=[\d"\-\]])/g, " "));
await browser.close();
