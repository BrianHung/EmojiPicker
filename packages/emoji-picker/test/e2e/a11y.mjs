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
    const expanded = await attr('[data-slot="search-input"]', "aria-expanded");
    // React Aria's Autocomplete: a searchbox that controls the results listbox (no aria-expanded: the list is always shown).
    check(
      "search field: a searchbox that controls the results listbox",
      (await attr('[data-slot="search-input"]', "role")) === "searchbox" && controlled === "listbox" && expanded === null,
      `role=${await attr('[data-slot="search-input"]', "role")} controls=${controlled} expanded=${expanded}`,
    );
    const status = await page.evaluate(() => [...document.querySelectorAll('#harness [role="status"]')].map((s) => s.textContent?.trim()).filter(Boolean));
    check("search results: one live region announces the count", status.length === 1 && /^\d+ results?$/.test(status[0] ?? ""), JSON.stringify(status));
  }
}

await mount(page, { kind: "vertical" });
await search().fill("thumbs up");
await page.waitForTimeout(250);
await page.keyboard.press("Shift+Space");
await page.waitForTimeout(150);
await axe("skin-tone variations open");
const variation = await page.evaluate((scope) => {
  const row = document.querySelector(`${scope} [data-slot="variations"]`);
  const option = row?.querySelector('[role="option"][tabindex="0"]');
  return { role: row?.getAttribute("role"), name: row?.getAttribute("aria-label"), option: option?.getAttribute("aria-label"), selected: option?.getAttribute("aria-selected"), focused: document.activeElement === option };
}, SCOPE);
check(
  "variations: a named listbox of tone options, the current one selected and focused",
  variation.role === "listbox" && Boolean(variation.name) && variation.option === "thumbs up" && variation.selected === "true" && variation.focused,
  JSON.stringify(variation),
);
await page.keyboard.press("Escape");
await search().fill("");
const landmark = await page.evaluate((scope) => (({ tagName, ariaLabel }) => ({ tagName, ariaLabel }))(document.querySelector(`${scope} [data-slot="emoji-picker"]`)), SCOPE);
check('root: a named landmark (aside, default "Emoji picker")', landmark.tagName === "ASIDE" && landmark.ariaLabel === "Emoji picker", JSON.stringify(landmark));
await page.locator(`${SCOPE} [data-slot="skin-tone"] > button`).click();
await page
  .locator(`${SCOPE} [data-slot="skin-tone-option"]`)
  .nth(3)
  .evaluate((b) => b.click());
await page.waitForTimeout(200);
const toned = () => page.evaluate((scope) => document.querySelector(`${scope} [data-slot="emoji"][data-unified="1f44d-1f3fd"]`)?.getAttribute("aria-label"), SCOPE);
const inList = await toned();
await search().fill("thumbs up");
await page.waitForTimeout(250);
check("cells: names include the skin tone, in the list and in results", inList === "thumbs up: medium skin tone" && (await toned()) === inList, `${inList} / ${await toned()}`);
await page.evaluate(() => localStorage.removeItem("emoji-picker:skin-tone"));

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
