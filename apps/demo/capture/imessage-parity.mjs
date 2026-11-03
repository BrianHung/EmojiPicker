// Key boxes of our iOS screen vs the screenshots (pt), both modes.
import { chromium } from "playwright";
const REAL = {
  tapback: { bar: [36, 475.5, 373, 63.3], button: [361.5, 530.5, 47, 47], bubble: [20, 545, 336, 86], menu: [20, 660, 250, 186] },
  emoji: { sheet: [1, 557, 438, 399], search: [8.7, 567, 421.6, 40], firstCell: [33.3, 644], lastCell: [410, 644], bubble: [20, 455, 336, 86], big: [309, 375, 74, 74] },
};
const b = await chromium.launch({ channel: "chrome", headless: true });
for (const mode of ["tapback", "emoji"]) {
  const p = await b.newPage({ viewport: { width: 440, height: 956 } });
  await p.goto(`http://localhost:5199/shot.html?view=imessage&mode=${mode}`);
  await p.locator(mode === "tapback" ? '[role="toolbar"]' : '[data-slot="emoji"]').first().waitFor();
  await p.waitForTimeout(500);
  const ours = await p.evaluate((mode) => {
    const box = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
    const center = (e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; };
    const layer = document.querySelector('[data-imessage] .z-20');
    const bubble = box(layer.querySelector('[data-text]').parentElement);
    if (mode === "tapback") return { bar: box(document.querySelector('[role="toolbar"]')), button: box(document.querySelector('[aria-label="More emoji"]')), bubble, menu: box(document.querySelector('[role="menu"]')) };
    const cells = [...document.querySelectorAll('[data-slot="emoji"]')];
    return { sheet: box(document.querySelector('[data-slot="emoji-picker"]')), search: box(document.querySelector('[data-slot="search-input"]')), firstCell: center(cells[0]), lastCell: center(cells[7]), bubble, big: box(layer.querySelector(".size-\\[74px\\]")) };
  }, mode);
  const rows = Object.entries(REAL[mode]).map(([k, real]) => {
    const o = ours[k];
    const d = Math.max(...real.map((v, i) => (k === "bubble" && i === 2 ? 0 : Math.abs(v - o[i]))));
    return `${k} ${d.toFixed(1)}pt`;
  });
  console.log(mode.padEnd(8), rows.join(" | "));
  await p.close();
}
await b.close();
