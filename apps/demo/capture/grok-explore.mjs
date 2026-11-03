import { chromium } from "playwright";
const b = await chromium.connectOverCDP("http://127.0.0.1:9333");
const page = b.contexts()[0].pages().find((p) => p.url().includes("index.html"));
await page.mouse.move(1000, 500);
await page.waitForTimeout(500);
console.log(await page.evaluate(() => [...document.querySelectorAll("button, [role=button]")].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height; }).map((e) => { const r = e.getBoundingClientRect(); return `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)} aria=${e.getAttribute("aria-label")} title=${e.getAttribute("title")} text=${(e.textContent || "").trim().slice(0, 20)}`; }).join("\n")));
console.log("sand classes:", await page.evaluate(() => [...new Set([...document.querySelectorAll("[class*=sand-]")].flatMap((e) => [...e.classList].filter((c) => c.startsWith("sand-"))))].slice(0, 40).join(" ")));
await b.close();
