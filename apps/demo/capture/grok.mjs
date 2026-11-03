// Drive Grok Bot over CDP (launched with --remote-debugging-port=9333). Read-only: open pickers, never send.
import { chromium } from "playwright";
const b = await chromium.connectOverCDP("http://127.0.0.1:9333");
const page = b.contexts()[0].pages().find((p) => p.url().includes("index.html"));
const cmd = process.argv[2] ?? "look";
if (cmd === "look") {
  await page.screenshot({ path: "out/grok-0.png" });
  console.log(await page.evaluate(() => ({ size: [innerWidth, innerHeight, devicePixelRatio], title: document.title, emojiBits: [...document.querySelectorAll("[class*=emoji], [aria-label*=moji i], [aria-label*=eaction i]")].slice(0, 15).map((e) => `${e.tagName}.${String(e.className).slice(0, 50)} aria=${e.getAttribute("aria-label")}`) })));
} else {
  console.log(await page.evaluate(cmd));
}
await b.close();
