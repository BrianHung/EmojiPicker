import { chromium } from "@playwright/test";
const REAL = {
  slack: { theme: "light", parts: { root: [0, 0, 361, 454], tab: [42.3, 4, 34.3, 38], input: [17.5, 56, 326, 36], glyph: [21.5, 132.5, 22, 22] } },
  discord: { theme: "dark", parts: { root: [0, 0, 498, 486], input: [16.8, 58.8, 414.4, 40], tone: [443.2, 59.8, 38, 38], tab: [8.8, 119.8, 32, 32], emoji: [56.8, 143.6, 48, 48] } },
  linear: { theme: "light", parts: { root: [0, 0, 273, 321], input: [5.5, 4.5, 262, 28], emoji: [10.5, 65.5, 28, 28] } },
  notion: { theme: "light", parts: { root: [0, 0, 408, 390], input: [8, 48, 322, 28], tone: [372, 48, 28, 28], tab: [12, 348, 32, 32], emoji: [12, 124.5, 32, 32] } },
};
const SEL = {
  root: "[data-slot=emoji-picker]",
  tab: "[data-slot=emoji-picker-category-tab]",
  input: "[data-slot=emoji-picker-search-input]",
  viewport: "[data-slot=emoji-picker-viewport]",
  emoji: "[data-slot=emoji-picker-emoji]",
  tone: "[data-slot=emoji-picker-skin-tone] > button",
  header: "[data-slot=emoji-picker-section-title]",
  glyph: "[data-slot=emoji-picker-emoji] > *",
};
const b = await chromium.launch({ channel: "chrome", headless: true });
for (const [style, { theme, parts }] of Object.entries(REAL)) {
  const p = await (await b.newContext({ deviceScaleFactor: 2 })).newPage();
  await p.goto(`http://localhost:5199/shot.html?style=${style}&theme=${theme}`);
  await p.locator(SEL.emoji).first().waitFor();
  const boxes = await p.evaluate((sel) => {
    const R = document.querySelector(sel.root).getBoundingClientRect();
    return Object.fromEntries(
      Object.entries(sel).map(([k, s]) => {
        const e = document.querySelector(s);
        if (!e) return [k, null];
        const r = e.getBoundingClientRect(),
          c = getComputedStyle(e),
          p = k === "glyph" ? [parseFloat(c.paddingLeft), parseFloat(c.paddingTop)] : [0, 0];
        return [k, [r.x - R.x + p[0], r.y - R.y + p[1], r.width - 2 * p[0], r.height - 2 * p[1]]];
      }),
    );
  }, SEL);
  let worst = 0;
  const rows = Object.entries(parts).map(([k, real]) => {
    const ours = boxes[k];
    const d = Math.max(...real.map((v, i) => Math.abs(v - ours[i])));
    worst = Math.max(worst, d);
    return `${k} ${d.toFixed(1)}px`;
  });
  console.log(`${style.padEnd(8)} worst ${worst.toFixed(1)}px  (${rows.join(", ")})`);
}
await b.close();
