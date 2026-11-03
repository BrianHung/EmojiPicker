import { chromium } from "playwright";
const b = await chromium.connectOverCDP("http://127.0.0.1:9333");
const page = b.contexts()[0].pages().find((p) => p.url().includes("index.html"));
await page.mouse.click(640, 722);
const box = page.locator(":focus");
console.log("focused:", await box.evaluate((e) => `${e.tagName} ce=${e.getAttribute("contenteditable")} role=${e.getAttribute("role")}`));
await page.keyboard.type(":smi", { delay: 60 });
await page.waitForTimeout(600);
await page.screenshot({ path: "out/grok-colon.png" });
console.log(await page.evaluate(() => [...document.querySelectorAll("[class*=emoji], [role=listbox], [role=option]")].slice(0, 12).map((e) => { const r = e.getBoundingClientRect(); return `${e.tagName}.${[...e.classList].filter((c) => !/^sand-[a-z0-9]{5,7}$/.test(c)).join(".")} role=${e.getAttribute("role")} ${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)} ${(e.textContent || "").slice(0, 30)}`; }).join("\n")));
// Clear what we typed; nothing is sent.
await page.keyboard.press("Escape");
for (let i = 0; i < 4; i++) await page.keyboard.press("Backspace");
console.log("composer after clear:", JSON.stringify(await page.evaluate(() => (document.activeElement?.value ?? document.activeElement?.textContent ?? "").slice(0, 40))));
await b.close();
