// Full demo page in both themes → out/page-<theme>.png (regression baseline for non-example pickers).
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome", headless: true });
for (const theme of ["light", "dark"]) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const errs = new Set();
  p.on("pageerror", (e) => errs.add(e.message.slice(0, 160)));
  await p.addInitScript((t) => { localStorage.setItem("demo:theme", t); localStorage.setItem("demo:renderer", "native"); }, theme);
  await p.goto("http://localhost:5199/");
  await p.locator('[data-epr-part="emoji"], [data-slot="emoji"]').first().waitFor();
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `out/page-${theme}.png`, fullPage: true, animations: "disabled", caret: "hide" });
  console.log(theme, errs.size ? [...errs] : "no errors");
  await p.close();
}
await b.close();
