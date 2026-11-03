// Full demo page: errors + screenshots in both themes.
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome", headless: true });
for (const theme of ["light", "dark"]) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = new Set();
  p.on("pageerror", (e) => errs.add(e.message.slice(0, 160)));
  p.on("console", (m) => m.type() === "error" && !/404/.test(m.text()) && errs.add(m.text().slice(0, 160)));
  await p.addInitScript((t) => localStorage.setItem("demo:theme", t), theme);
  await p.goto("http://localhost:5199/");
  await p.locator('[data-epr-part="emoji"]').first().waitFor();
  await p.waitForTimeout(1500);
  await p.locator("#examples").scrollIntoViewIfNeeded();
  await p.waitForTimeout(800);
  await p.screenshot({ path: `out/site-examples-${theme}.png` });
  await p.locator("#demo").scrollIntoViewIfNeeded();
  await p.waitForTimeout(500);
  await p.screenshot({ path: `out/site-demo-${theme}.png` });
  console.log(theme, errs.size ? [...errs] : "no errors");
  await p.close();
}
await b.close();
