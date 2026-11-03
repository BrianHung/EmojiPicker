// Accessibility: axe-core on every part in its states, plus the ARIA the APG patterns
// call for that axe can't infer.   npm run test:a11y -w @brianhung/emoji-picker
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { SCOPE, check, failed, mount, openHarness } from "./lib.mjs";

// axe-core: the local package if installed, else a pinned build.
const AXE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js";
function localAxe() {
  try {
    const path = createRequire(import.meta.url).resolve("axe-core/axe.min.js");
    return existsSync(path) ? readFileSync(path, "utf8") : null;
  } catch {
    return null;
  }
}

const { browser, page, errors } = await openHarness();
const knownEngine = new Set();
const source = localAxe();
async function axe(name, include = ["#harness"]) {
  if (!(await page.evaluate(() => "axe" in window))) await page.addScriptTag(source ? { content: source } : { url: AXE_CDN });
  const result = await page.evaluate(async (include) => {
    const context = { include: include.filter((s) => document.querySelector(s)).map((s) => [s]) };
    // The demo page around the harness isn't under test; only WCAG A/AA rules.
    const r = await window.axe.run(context, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] }, rules: { region: { enabled: false } } });
    // Known, engine-owned: emoji-picker-react renders its list as ul[role=grid] > li[role=rowgroup].
    const engineList = (v) => v.id === "aria-allowed-role" && v.nodes.every((n) => n.html.startsWith("<ul") || n.html.startsWith("<li"));
    const line = (v) => `${v.id} (${v.impact}): ${v.nodes.length}× ${v.nodes[0]?.target.join(" ")} — ${v.help}`;
    return { failures: r.violations.filter((v) => !engineList(v)).map(line), known: r.violations.filter(engineList).map(line) };
  }, include);
  check(`axe: ${name}`, result.failures.length === 0, result.failures.join("\n      "));
  if (result.known.length) knownEngine.add(result.known[0].split(":")[0]);
}
const attr = (sel, name) => page.evaluate(([sel, name]) => document.querySelector(sel)?.getAttribute(name) ?? null, [`${SCOPE} ${sel}`, name]);
const search = () => page.locator(`${SCOPE} [data-slot="search-input"]`);

for (const focusModel of ["input", "grid"]) {
  await mount(page, { kind: "vertical", root: { focusModel }, customs: 3 });
  await axe(`vertical list (${focusModel})`);
  await search().click();
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(250);
  await axe(`vertical list, navigating (${focusModel})`);
  await search().fill("smile");
  await page.waitForTimeout(250);
  await axe(`search results (${focusModel})`);
  if (focusModel === "input") {
    const controls = await attr('[data-slot="search-input"]', "aria-controls");
    const controlled = await page.evaluate((id) => document.getElementById(id ?? "")?.getAttribute("role"), controls);
    check("search field: a combobox that controls the results grid", (await attr('[data-slot="search-input"]', "role")) === "combobox" && controlled === "grid", `role=${await attr('[data-slot="search-input"]', "role")} controls=${controlled}`);
    const status = await page.evaluate(() => [...document.querySelectorAll('#harness [role="status"]')].map((s) => s.textContent?.trim()).filter(Boolean));
    check("search results: one live region announces the count", status.length === 1 && /^\d+ results?$/.test(status[0] ?? ""), JSON.stringify(status));
  }
}

await mount(page, { kind: "horizontal" });
await axe("horizontal list");
await search().click();
await page.keyboard.press("ArrowDown");
await page.waitForTimeout(200);
await axe("horizontal list, navigating");

await mount(page, { kind: "vertical" });
await page.locator('#harness [data-slot="skin-tone"] button').first().click();
await page.waitForTimeout(150);
await axe("skin tone menu open");
check("skin tone: button reports its menu", (await attr('[data-slot="skin-tone"] > button', "aria-expanded")) === "true" && (await attr('[data-slot="skin-tone-options"]', "role")) === "radiogroup");
const tabs = await page.evaluate(() => {
  const nav = document.querySelector('#harness [data-slot="category-nav"] [role="tablist"], #harness [data-slot="category-nav"][role="tablist"]');
  const tab = document.querySelector('#harness [data-slot="category-tab"]');
  return { tablist: Boolean(nav), role: tab?.getAttribute("role"), selected: tab?.hasAttribute("aria-selected"), name: tab?.getAttribute("aria-label") };
});
check("category nav: a tablist of named tabs with aria-selected", tabs.tablist && tabs.role === "tab" && tabs.selected && Boolean(tabs.name), JSON.stringify(tabs));

await mount(page, { kind: "tapback", selected: ["2764-fe0f", "1f44d-1f3fd"] });
await axe("tapback");
const row = await page.evaluate(() => [...document.querySelectorAll('#harness [data-slot="reactions"] button')].map((b) => ({ label: b.getAttribute("aria-label"), pressed: b.getAttribute("aria-pressed"), tab: b.tabIndex })));
check("tapback: the user's reactions are aria-pressed (any skin tone), others not", row[0]?.pressed === "true" && row[1]?.pressed === "true" && row[2]?.pressed === "false", JSON.stringify(row.slice(0, 3)));
check("tapback: one tab stop (roving tabindex)", row.filter((b) => b.tab === 0).length === 1, JSON.stringify(row.map((b) => b.tab)));
await page.locator('#harness [data-slot="reactions"] button').first().focus();
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(100);
const moved = await page.evaluate(() => [...document.querySelectorAll('#harness [data-slot="reactions"] button')].map((b) => b.tabIndex));
check("tapback: the tab stop follows focus", moved[1] === 0 && moved.filter((t) => t === 0).length === 1, JSON.stringify(moved));

await mount(page, { kind: "popover" });
await page.locator('#harness [data-testid="trigger"]').click();
await page.waitForTimeout(300);
await axe("popover open", ["#harness", '[data-slot="popover-content"]']);
const trigger = await page.evaluate(() => {
  const t = document.querySelector('#harness [data-testid="trigger"]');
  const c = document.querySelector('[data-slot="popover-content"]');
  return { haspopup: t.getAttribute("aria-haspopup"), expanded: t.getAttribute("aria-expanded"), controls: t.getAttribute("aria-controls") === c?.id, role: c?.getAttribute("role") };
});
check("popover: the trigger names its dialog (haspopup, expanded, controls)", trigger.haspopup === "dialog" && trigger.expanded === "true" && trigger.controls && trigger.role === "dialog", JSON.stringify(trigger));

await mount(page, { kind: "autocomplete" });
await page.locator('#harness [data-testid="composer"]').click();
await page.keyboard.type(":smi");
await page.waitForTimeout(300);
await axe("autocomplete open");

check("no page errors", errors.length === 0, errors.join(" | "));
if (knownEngine.size) check("engine markup (emoji-picker-react's list: ul[role=grid] > li[role=rowgroup])", false, [...knownEngine].join(), { warn: true });
await browser.close();
const n = failed();
console.log(n ? `\n${n} failed` : "\nall passed");
process.exit(n ? 1 : 0);
