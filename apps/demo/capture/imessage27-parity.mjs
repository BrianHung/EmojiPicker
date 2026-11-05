import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const states = process.argv.slice(2).length ? process.argv.slice(2) : ["reacted", "pill", "keyboard", "menu", "selected", "incoming"];
const ready = { reacted: '[data-imessage] [role="button"]', pill: '[role="toolbar"]', selected: '[role="toolbar"]', menu: '[role="menu"]', incoming: '[aria-label="Reaction received"]', keyboard: "[data-emoji-keyboard] [data-slot=emoji]" };
const noRef = new Set(["selected", "incoming"]);

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
  await page.waitForTimeout(state === "keyboard" ? 900 : 500);
  await page.locator('[data-shot="imessage27"]').screenshot({ path: `${here}/out/imessage27-${state}.png` });
  await ctx.close();
}
await browser.close();

const compared = states.filter((s) => !noRef.has(s));
const report = compared.length ? JSON.parse(execFileSync("python3", ["imessage27-compare.py", ...compared], { cwd: here, encoding: "utf8" })) : {};
writeFileSync(`${here}/out/imessage27-parity.json`, JSON.stringify(report, null, 2));
for (const [state, r] of Object.entries(report)) {
  const parts = Object.entries(r.parts);
  const worst = parts.filter(([, p]) => p.gap != null).sort((a, b) => b[1].gap - a[1].gap);
  console.log(`\n${state}: ${r.changed}% pixels changed (${r.changedBelowStatusBar}% below the status bar); worst part gap ${worst[0]?.[1].gap ?? "-"} pt (${worst[0]?.[0] ?? "-"})`);
  for (const [name, p] of parts) console.log(`  ${name.padEnd(16)} ${p.gap == null ? "missing" : `${p.gap.toFixed(1)} pt`}`.padEnd(32) + `real ${JSON.stringify(p.real)}  ours ${JSON.stringify(p.ours)}`);
}
console.log(errors.length ? `\nerrors:\n${errors.join("\n")}` : "\nno page errors");
