// Our iOS Messages screen at device scale (440×956 pt @3x = 1320×2868, like the screenshots), both modes.
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome", headless: true });
for (const mode of ["tapback", "emoji"]) {
  const ctx = await b.newContext({ deviceScaleFactor: 3, viewport: { width: 440, height: 956 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(`http://localhost:5199/shot.html?view=imessage&mode=${mode}`);
  await p.locator(mode === "tapback" ? '[role="toolbar"]' : '[data-slot="emoji"]').first().waitFor();
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  await p.locator('[data-shot="imessage"]').screenshot({ path: `out/imessage-${mode}.png` });
  console.log(mode, errors.length ? errors : "ok");
  await ctx.close();
}
await b.close();
