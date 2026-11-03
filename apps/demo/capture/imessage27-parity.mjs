// iOS 27.2 Messages parity: screenshot our screen at 3x (402×874 pt → 1206×2622, like the
// simulator captures in ref/imessage27-*.png) in each state, then compare per part.
//   node capture/imessage27-parity.mjs [reacted pill keyboard]   (dev server on :5199)
// Writes out/imessage27-<state>.png, out/imessage27-<state>-compare.png,
// out/imessage27-side-by-side.png and out/imessage27-parity.json.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const states = process.argv.slice(2).length ? process.argv.slice(2) : ["reacted", "pill", "keyboard"];
const ready = { reacted: '[data-imessage] [role="button"]', pill: '[role="toolbar"]', keyboard: "[data-emoji-keyboard] [data-slot=emoji]" };

const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
for (const state of states) {
  const ctx = await browser.newContext({ deviceScaleFactor: 3, viewport: { width: 402, height: 874 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${state}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !m.location().url.endsWith("/favicon.ico") && errors.push(`${state}: ${m.text()}`));
  await page.goto(`http://localhost:5199/shot.html?view=imessage27&state=${state}`);
  await page.locator(ready[state]).first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  // The sheet's open transition is CSS (the Drawer), not motion: let it settle.
  await page.waitForTimeout(state === "keyboard" ? 900 : 500);
  await page.locator('[data-shot="imessage27"]').screenshot({ path: `${here}/out/imessage27-${state}.png` });
  await ctx.close();
}
await browser.close();

const report = JSON.parse(execFileSync("python3", ["imessage27-compare.py", ...states], { cwd: here, encoding: "utf8" }));
writeFileSync(`${here}/out/imessage27-parity.json`, JSON.stringify(report, null, 2));
for (const [state, r] of Object.entries(report)) {
  const parts = Object.entries(r.parts);
  const worst = parts.filter(([, p]) => p.gap != null).sort((a, b) => b[1].gap - a[1].gap);
  console.log(`\n${state}: ${r.changed}% pixels changed (${r.changedBelowStatusBar}% below the status bar); worst part gap ${worst[0]?.[1].gap ?? "-"} pt (${worst[0]?.[0] ?? "-"})`);
  for (const [name, p] of parts) console.log(`  ${name.padEnd(16)} ${p.gap == null ? "missing" : `${p.gap.toFixed(1)} pt`}`.padEnd(32) + `real ${JSON.stringify(p.real)}  ours ${JSON.stringify(p.ours)}`);
}
console.log(errors.length ? `\nerrors:\n${errors.join("\n")}` : "\nno page errors");
