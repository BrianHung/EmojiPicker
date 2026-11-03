// Key part boxes in our examples vs the numbers measured from the real apps (CSS px, picker-relative).
import { chromium } from "playwright";
const REAL = {
  slack: { theme: "light", parts: { root: [0, 0, 361, 504], tab: [44, 54, 34, 38], input: [17.5, 106, 326, 36], viewport: [6.5, 149, 354.5, 295], emoji: [15, 176, 33, 33] } },
  discord: { theme: "dark", parts: { root: [0, 0, 498, 486], input: [16.8, 58.8, 300.8, 40], tone: [329.6, 59.8, 38, 38], tab: [8.8, 119.8, 32, 32], emoji: [56.8, 143.6, 48, 48] } },
  linear: { theme: "light", parts: { root: [0, 0, 273, 321], input: [5.5, 4.5, 262, 28], header: [10.5, 37.5, 241, 28], emoji: [10.5, 65.5, 28, 28] } },
};
const SEL = { root: "[data-slot=emoji-picker]", tab: "[data-slot=category-tab]", input: "[data-slot=search-input]", viewport: "[data-slot=viewport]", emoji: "[data-slot=emoji]", tone: "[data-slot=skin-tone] > button", header: "[data-slot=category-header]" };
const b = await chromium.launch({ channel: "chrome", headless: true });
for (const [style, { theme, parts }] of Object.entries(REAL)) {
  const p = await (await b.newContext({ deviceScaleFactor: 2 })).newPage();
  await p.goto(`http://localhost:5199/shot.html?style=${style}&theme=${theme}`);
  await p.locator(SEL.emoji).first().waitFor();
  const boxes = await p.evaluate((sel) => {
    const R = document.querySelector(sel.root).getBoundingClientRect();
    return Object.fromEntries(Object.entries(sel).map(([k, s]) => { const e = document.querySelector(s); if (!e) return [k, null]; const r = e.getBoundingClientRect(); return [k, [r.x - R.x, r.y - R.y, r.width, r.height]]; }));
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
