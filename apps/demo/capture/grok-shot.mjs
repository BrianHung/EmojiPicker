// Our Grok-style menu for ":smi" at 2x, next to the reference, plus measured gaps.
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ deviceScaleFactor: 2, viewport: { width: 500, height: 400 } });
await p.goto("http://localhost:5199/shot.html?view=grok");
const menu = p.locator('[data-shot="grok"] > div');
await menu.locator("button").first().waitFor();
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(300);
await menu.screenshot({ path: "out/grok-light.png" });
console.log(await p.evaluate(() => {
  const m = document.querySelector('[data-shot="grok"] > div'); const M = m.getBoundingClientRect();
  const cells = [...m.querySelectorAll("button")];
  const r = (e) => { const x = e.getBoundingClientRect(); return `${Math.round(x.x - M.x)},${Math.round(x.y - M.y)} ${x.width}x${x.height}`; };
  const label = m.querySelector("div > div"); const range = document.createRange(); range.selectNodeContents(label.firstChild ?? label); const lr = range.getBoundingClientRect();
  return `menu ${M.width}x${M.height} | label text ${Math.round(lr.x - M.x)},${Math.round(lr.y - M.y)} | cells ${cells.length}: first ${r(cells[0])} second ${r(cells[1])} ninth ${r(cells[8])}\norder: ${cells.map((c) => c.textContent).join(" ")}`;
}));
await b.close();
