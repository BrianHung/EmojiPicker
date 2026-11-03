// Grok Bot's `:` emoji menu: a 2x element screenshot and exact styles. Types ":smi", then clears it; never sends.
import { chromium } from "playwright";
const b = await chromium.connectOverCDP("http://127.0.0.1:9333");
const page = b.contexts()[0].pages().find((p) => p.url().includes("index.html"));
await page.mouse.click(640, 722);
await page.keyboard.type(":smi", { delay: 50 });
const menu = page.locator(".sand-emoji-menu");
await menu.waitFor();
await page.waitForTimeout(400);
await menu.screenshot({ path: "ref/grok-autocomplete.png" });
console.log(await page.evaluate(() => {
  const m = document.querySelector(".sand-emoji-menu"); const M = m.getBoundingClientRect();
  const text = (el) => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const n = w.nextNode(); if (!n) return null; const r = document.createRange(); r.selectNodeContents(n); const rr = r.getBoundingClientRect(); const s = getComputedStyle(n.parentElement); return `"${n.textContent}" at ${Math.round(rr.x - M.x)},${Math.round(rr.y - M.y)} h=${Math.round(rr.height)} font=${s.fontSize} ${s.fontWeight} color=${s.color} letter=${s.letterSpacing}`; };
  const label = m.querySelector(".sand-emoji-picker__section-label");
  const cells = [...m.querySelectorAll(".sand-emoji-cell")];
  const c0 = cells[0], c1 = cells[1], c8 = cells[8];
  const r = (e) => { const x = e.getBoundingClientRect(); return `${Math.round(x.x - M.x)},${Math.round(x.y - M.y)} ${x.width}x${x.height}`; };
  const cs = getComputedStyle(c1);
  return [
    `menu ${M.width}x${M.height} shadow=${getComputedStyle(m).boxShadow}`,
    `label ${text(label)}`,
    `cells ${cells.length}: first ${r(c0)} second ${r(c1)} ninth ${r(c8)}`,
    `cell idle bg=${cs.backgroundColor} radius=${cs.borderRadius} | highlighted: ${getComputedStyle(c0).backgroundColor} aria-selected=${c0.getAttribute("aria-selected")}`,
    `glyph ${text(c0)}`,
    `order: ${cells.map((c) => c.textContent).join(" ")}`,
    `titles: ${cells.slice(0, 6).map((c) => c.getAttribute("title") || c.getAttribute("aria-label")).join(" | ")}`,
  ].join("\n");
}));
await page.keyboard.press("Escape");
for (let i = 0; i < 4; i++) await page.keyboard.press("Backspace");
console.log("composer after:", JSON.stringify(await page.evaluate(() => document.querySelector("[role=textbox]")?.textContent)));
await b.close();
