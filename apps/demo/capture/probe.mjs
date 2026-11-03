// Run an expression in a capture page: node probe.mjs slack 'document.title'
import { chromium } from "playwright";
const [skin, expr, theme = "light"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ deviceScaleFactor: 2 });
await p.goto(`http://localhost:5199/shot.html?skin=${skin}&theme=${theme}`);
await p.locator('[data-epr-part="emoji"]').first().waitFor({ timeout: 15000 });
console.log(await p.evaluate(expr));
await b.close();
