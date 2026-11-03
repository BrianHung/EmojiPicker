// The Search section on the demo page: each engine, both modes, async remote.
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
await p.addInitScript(() => localStorage.setItem("demo:renderer", "native"));
await p.goto("http://localhost:5199/#search");
const section = p.locator("#search");
await section.locator('[data-slot="emoji"]').first().waitFor();
const top = () => section.evaluate((s) => [...s.querySelectorAll('[data-results] [data-slot="emoji"]')].slice(0, 6).map((c) => c.textContent || "🖼").join(" "));
const type = async (q) => { await section.locator('[data-slot="search-input"]').fill(q); await p.waitForTimeout(300); };
for (const engine of ["lexical()", "no typos", "+ Fuse", "+ frequents"]) {
  await section.getByRole("radio", { name: engine }).click();
  await section.locator('[data-slot="emoji"]').first().waitFor();
  const row = [];
  for (const q of ["heart", "rokcet", "thumsb up", "lgtm"]) { await type(q); row.push(`${q}: ${(await top()) || "∅"}`); }
  console.log(engine.padEnd(12), row.join(" | "));
}
await section.getByRole("radio", { name: "remote (400 ms)" }).click();
await section.locator('[data-slot="emoji"]').first().waitFor();
await type("fire");
await p.waitForTimeout(500);
await section.locator('[data-slot="search-input"]').fill("rocket");
const during = { busy: await section.locator('[aria-busy="true"]').count(), showing: await top() };
await p.waitForTimeout(600);
console.log("remote: while pending", during, "→ settled:", await top());
await section.getByRole("radio", { name: "grouped" }).click();
await section.getByRole("radio", { name: "lexical()" }).click();
await section.locator('[data-slot="emoji"]').first().waitFor();
await type("party");
console.log("grouped:", await section.evaluate((s) => [...s.querySelectorAll('[data-results="grouped"] [data-slot="category-header"]')].map((h) => h.textContent).join(", ")));
await section.screenshot({ path: "out/search-section.png" });
console.log(errors.length ? errors : "no errors");
await b.close();
