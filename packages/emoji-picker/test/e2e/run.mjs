// Behaviour checks in a real browser: keyboard in every layout and focus model,
// focus after picking, the popover's focus and transition hooks, custom packs,
// artwork overrides, and worst-case data. Against the demo's dev server (:5199):
//   npm run test:e2e -w @brianhung/emoji-picker
// or the package's own (no demo needed):
//   npm run e2e:serve -w @brianhung/emoji-picker
//   BASE_URL=http://localhost:5299 npm run test:e2e -w @brianhung/emoji-picker
import { SCOPE, check, failed, focused, highlighted, mount, openHarness } from "./lib.mjs";

const { browser, page, errors } = await openHarness();
const $ = (sel) => page.locator(`${SCOPE} ${sel}`);
const press = async (key, wait = 120) => {
  await page.keyboard.press(key);
  await page.waitForTimeout(wait);
};
const rectOf = () => page.evaluate(() => document.activeElement.getBoundingClientRect().toJSON());
const search = () => $('[data-slot="search-input"]');

const GRID = { focusModel: "grid" };

// --- Vertical list, focusModel "grid" (the engine moves focus) -----------------
await mount(page, { kind: "vertical", root: GRID });
await search().click();
await press("ArrowDown", 200);
const first = await focused(page);
check("vertical: Down from search focuses a cell", first.slot === "emoji");
const top0 = (await rectOf()).top;
await press("PageDown", 350);
const afterPage = await focused(page);
const scrolled = await $('[data-slot="viewport"]').evaluate((v) => v.scrollTop);
check("vertical: PageDown keeps a cell focused and scrolls", afterPage.slot === "emoji" && afterPage.label !== first.label && scrolled > 100, `${afterPage.label}, scrollTop ${scrolled}`);
await press("PageUp", 350);
check("vertical: PageUp comes back up", (await focused(page)).slot === "emoji" && (await $('[data-slot="viewport"]').evaluate((v) => v.scrollTop)) < scrolled);
await press("End", 500);
check("vertical: End focuses the last emoji", (await focused(page)).label === "flag: wales", (await focused(page)).label);
await press("Home", 500);
check("vertical: Home focuses the first emoji", (await focused(page)).label === first.label && Math.abs((await rectOf()).top - top0) < 2);
await press("Control+End", 500);
check("vertical: Ctrl+End focuses the last emoji", (await focused(page)).label === "flag: wales");
await press("Control+Home", 500);
await press("ArrowRight");
const beforePick = await focused(page);
await press("Enter", 300);
const afterPick = await focused(page);
check("vertical: Enter picks and the cell keeps focus", (await page.evaluate(() => window.__picks.length)) === 1 && afterPick.label === beforePick.label && afterPick.slot === "emoji", afterPick.label);
await press("ArrowRight");
await press("Enter", 300);
check("vertical: keep arrowing and picking", (await page.evaluate(() => window.__picks.length)) === 2 && (await focused(page)).slot === "emoji");

// --- Search results (focus stays in the field) ---------------------------------
await mount(page, { kind: "vertical" });
await search().fill("smile");
await page.waitForTimeout(200);
const h0 = await highlighted(page);
await press("ArrowRight");
const h1 = await highlighted(page);
check("results: Right (caret at end) moves the highlight", h0 && h1 && h0 !== h1, `${h0} → ${h1}`);
await press("ArrowDown");
check("results: Down moves a row", (await highlighted(page)) !== h1);
await press("Control+End");
const last = await highlighted(page);
await press("Control+Home");
check("results: Ctrl+End / Ctrl+Home go to the last and first result", last !== h0 && (await highlighted(page)) === h0, last);
await press("Home");
check("results: Home stays with the text (caret to start)", (await search().evaluate((i) => i.selectionStart)) === 0 && (await highlighted(page)) === h0);
await press("ArrowRight");
check("results: Right mid-text moves the caret, not the highlight", (await search().evaluate((i) => i.selectionStart)) === 1 && (await highlighted(page)) === h0);
await search().evaluate((i) => i.setSelectionRange(5, 5));
await press("ArrowLeft");
check("results: Left from the first result moves the caret", (await search().evaluate((i) => i.selectionStart)) === 4 && (await highlighted(page)) === h0);
await press("End");
await press("PageDown");
check("results: PageDown moves the highlight", (await highlighted(page)) !== h0);
await press("Control+Home");
await press("ArrowRight");
const picked = await highlighted(page);
const picksBefore = await page.evaluate(() => window.__picks.length);
await press("Enter", 250);
check(
  "results: Enter picks; focus, highlight and query stay",
  (await page.evaluate(() => window.__picks.length)) === picksBefore + 1 && (await focused(page)).slot === "search-input" && (await highlighted(page)) === picked && (await search().inputValue()) === "smile",
);
await $('[data-slot="emoji"][data-highlighted]').click();
check("results: clicking a result keeps focus in the field", (await focused(page)).slot === "search-input" && (await page.evaluate(() => window.__picks.length)) === picksBefore + 2);
await search().fill("zzqqxxj");
await page.waitForTimeout(200);
await press("ArrowDown");
await press("PageDown");
await press("Enter");
check("results: 0 results shows Empty, keys are harmless", (await $('[data-slot="empty"]').count()) === 1 && (await $('[data-slot="emoji"][data-highlighted]').count()) === 0 && (await focused(page)).slot === "search-input");
await search().fill("");

await mount(page, { kind: "vertical", searchResults: "grouped" });
await search().fill("cat");
await page.waitForTimeout(200);
// Positions in the list, not the viewport (the highlight scrolls into view).
const yInList = () => page.evaluate(() => document.querySelector("#harness [data-highlighted]").getBoundingClientRect().top - document.querySelector('#harness [data-slot="list"]').getBoundingClientRect().top);
const groups = () => page.evaluate(() => document.querySelectorAll('#harness [data-slot="list"] section').length);
await press("Control+Home");
const g0 = await yInList();
for (let i = 0; i < 3; i++) await press("ArrowDown");
const g1 = await yInList();
const section = await page.evaluate(() => [...document.querySelectorAll('#harness [data-slot="list"] section')].findIndex((s) => s.querySelector("[data-highlighted]")));
check("results (grouped): Down moves by visual rows across sections", g1 > g0 && (await groups()) > 2 && section === 2, `${g0} → ${g1}, section ${section}`);

// --- Keymap and onKeyDown ----------------------------------------------------------
await mount(page, { kind: "vertical", keymap: { "move-down": ["j"], "move-up": ["k"], select: ["Enter", "Mod+Enter"] } });
await search().click();
await page.keyboard.type("j");
check("keymap: a remapped printable key still types in search", (await search().inputValue()) === "j");
await search().fill("");
await press("ArrowDown", 200); // ArrowDown isn't bound now: the engine doesn't leave search
check("keymap: an unbound engine key does nothing", (await focused(page)).slot === "search-input");
await page.locator('#harness [data-slot="emoji"]').first().focus();
const k0 = await rectOf();
const kLabel = (await focused(page)).label;
await press("j", 200);
const k1 = await rectOf();
check("keymap: j moves down in the grid", k1.top > k0.top, `${k0.top} → ${k1.top}`);
await press("k", 200);
check("keymap: k moves up", (await rectOf()).top === k0.top);
await press("ArrowDown", 200);
check("keymap: ArrowDown no longer moves", (await focused(page)).label === kLabel);
await press("Meta+Enter", 200);
check("keymap: Mod+Enter selects", (await page.evaluate(() => window.__picks.length)) === 1);

await mount(page, { kind: "vertical", intercept: "ArrowRight", interceptOnList: "Enter", root: GRID });
await search().click();
await press("ArrowDown", 200);
const i0 = await focused(page);
await press("ArrowRight", 200);
check("onKeyDown: preventEmojiPickerHandler() on Root stops the move", (await focused(page)).label === i0.label);
await page.evaluate(() => (window.__keys.length = 0));
await press("Enter", 200);
check(
  "onKeyDown: List's handler runs before Root's, and can stop the pick",
  (await page.evaluate(() => window.__picks.length)) === 0 && (await page.evaluate(() => window.__keys.join())) === "list:Enter,root:Enter",
  await page.evaluate(() => window.__keys.join()),
);

await mount(page, { kind: "vertical", keymap: { "toggle-skin-tone": ["Shift+T"] }, root: GRID });
await search().click();
await press("ArrowDown", 200);
await press("/");
check("focus-search: / from the grid focuses the search field", (await focused(page)).slot === "search-input" && (await search().inputValue()) === "");
await press("ArrowDown", 200);
await press("Shift+T", 200);
check("toggle-skin-tone: opens the menu on the current tone", (await focused(page)).slot === "skin-tone-option");
await press("ArrowRight");
await press("Escape", 200);
check("close: Escape closes the skin-tone menu first, focus back on its button", (await $('[data-slot="skin-tone-options"]').count()) === 0 && (await page.evaluate(() => document.activeElement?.closest('[data-slot="skin-tone"]') != null)));

// --- focusModel "input" (default): focus stays in search, a highlight moves ---------
const activeDescendant = () =>
  search().evaluate((i) => {
    const id = i.getAttribute("aria-activedescendant");
    return id ? (document.getElementById(id)?.getAttribute("aria-label") ?? "(missing)") : null;
  });
await mount(page, { kind: "vertical" });
await search().click();
await press("ArrowDown", 250);
const in0 = await highlighted(page);
check(
  "input model: Down highlights the first emoji; focus stays in search; aria-activedescendant names it",
  in0 && (await focused(page)).slot === "search-input" && (await activeDescendant()) === in0,
  `${in0} / ${await activeDescendant()}`,
);
await press("ArrowRight", 150);
const in1 = await highlighted(page);
const hoverTarget = $('[data-slot="emoji"]').nth(30);
const hoverLabel = await hoverTarget.getAttribute("aria-label");
await hoverTarget.hover();
await page.waitForTimeout(150);
check('pointer "follows": hover moves the highlight', (await highlighted(page)) === hoverLabel && (await focused(page)).slot === "search-input", `${await highlighted(page)} vs ${hoverLabel}`);
await press("ArrowRight", 150);
const afterHover = await highlighted(page);
check('pointer "follows": arrows continue from the hovered emoji', afterHover !== in1 && afterHover !== hoverLabel, afterHover);
await press("PageDown", 400);
check("input model: PageDown moves the highlight a page", (await highlighted(page)) !== afterHover && (await focused(page)).slot === "search-input");
await press("Control+End", 500);
check("input model: Ctrl+End highlights the last emoji", (await highlighted(page)) === "flag: wales");
await press("Control+Home", 500);
const firstHl = await highlighted(page);
await press("Enter", 250);
check("input model: Enter picks the highlight; focus and highlight stay", (await page.evaluate(() => window.__picks.length)) === 1 && (await highlighted(page)) === firstHl && (await focused(page)).slot === "search-input");
await search().fill("smile");
await page.waitForTimeout(200);
check("input model: results' aria-activedescendant names the highlighted result", (await activeDescendant()) === (await highlighted(page)));
await press("Escape", 150);
check("input model: Escape with a query clears it in one press", (await search().inputValue()) === "");

await mount(page, { kind: "vertical", root: { pointer: "independent" } });
await search().click();
await press("ArrowDown", 250);
await press("ArrowRight", 150);
const ind0 = await highlighted(page);
await $('[data-slot="emoji"]').nth(30).hover();
await page.waitForTimeout(150);
check(
  'pointer "independent": hover leaves the highlight alone, the footer previews the hovered emoji',
  (await highlighted(page)) === ind0 && (await $('[data-testid="footer"]').textContent())?.includes((await $('[data-slot="emoji"]').nth(30).getAttribute("aria-label")) ?? "?"),
);
await press("ArrowRight", 150);
check('pointer "independent": arrows continue from the highlight', (await highlighted(page)) !== ind0);

await mount(page, { kind: "horizontal" });
await search().click();
await press("ArrowDown", 200);
const st0 = await page.evaluate(() => document.querySelector('#harness [data-slot="emoji"][data-highlighted]')?.getAttribute("data-index"));
await press("ArrowRight", 150);
const st1 = await page.evaluate(() => document.querySelector('#harness [data-slot="emoji"][data-highlighted]')?.getAttribute("data-index"));
await press("Enter", 250);
check(
  "input model, horizontal: arrows highlight from the field, Enter picks, focus stays",
  st0 === "0" && st1 === "5" && (await focused(page)).slot === "search-input" && (await page.evaluate(() => window.__picks.length)) === 1 && (await activeDescendant()) != null,
  `${st0} → ${st1}`,
);
await press("Escape", 150);
check("input model, horizontal: Escape ends the highlight", (await page.locator('#harness [data-slot="emoji"][data-highlighted]').count()) === 0 && (await focused(page)).slot === "search-input");

await mount(page, { kind: "vertical", root: GRID });
await search().fill("smile");
await page.waitForTimeout(200);
await press("ArrowDown", 150);
const gr0 = await focused(page);
await press("ArrowRight", 150);
const gr1 = await focused(page);
await press("ArrowUp", 150);
await press("ArrowUp", 150);
check(
  "grid model, results: Down focuses the highlighted result, arrows move focus, Up from the top row returns to search",
  gr0.slot === "emoji" && gr1.slot === "emoji" && gr1.label !== gr0.label && (await focused(page)).slot === "search-input",
  `${gr0.label} → ${gr1.label}`,
);

// --- Horizontal list ------------------------------------------------------------------
for (const dir of ["ltr", "rtl"]) {
  await mount(page, { kind: "horizontal", dir, single: true, root: GRID });
  await search().click();
  await press("ArrowDown", 200);
  const s0 = await focused(page);
  const r0 = await rectOf();
  const forward = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
  await press(forward);
  const s1 = await focused(page);
  const r1 = await rectOf();
  check(`horizontal ${dir}: ${forward} goes to the next column, on screen in that direction`, s0.index === "0" && s1.index === "5" && (dir === "rtl" ? r1.left < r0.left : r1.left > r0.left), `${s0.index} → ${s1.index}`);
  if (dir === "rtl") {
    const vp = await $('[data-slot="viewport"]').evaluate((v) => v.getBoundingClientRect().right);
    check("horizontal rtl: the strip starts at the right edge", r0.right > vp - 60, `${r0.right} / ${vp}`);
  }
  await press("ArrowDown");
  check(`horizontal ${dir}: Down moves within the column`, (await focused(page)).index === "6");
  await press("PageDown", 200);
  const p1 = Number((await focused(page)).index);
  check(`horizontal ${dir}: PageDown moves a page of columns`, p1 >= 6 + 5 * 5, String(p1));
  await press("PageUp", 200);
  check(`horizontal ${dir}: PageUp moves back`, Number((await focused(page)).index) < p1);
  await press("End", 200);
  const end = await focused(page);
  await press("Home", 200);
  check(`horizontal ${dir}: End / Home go to the last and first emoji`, Number(end.index) > 1000 && (await focused(page)).index === "0");
  await press(forward);
  const before = await focused(page);
  await press("Enter", 250);
  check(`horizontal ${dir}: Enter picks and the cell keeps focus`, (await page.evaluate(() => window.__picks.length)) === 1 && (await focused(page)).index === before.index);
}
// A one-emoji section: Left/Right cross it.
await mount(page, { kind: "horizontal", single: true });
const lonely = $('[data-slot="emoji"][aria-label="lonely"]');
await page.evaluate(() => {
  const tab = [...document.querySelectorAll('#harness [data-slot="category-tab"]')].find((t) => /single/i.test(t.getAttribute("aria-label") ?? t.textContent ?? ""));
  tab?.click();
});
await page.waitForTimeout(600);
if (await lonely.count()) {
  await lonely.focus();
  await press("ArrowRight");
  const right = await focused(page);
  await press("ArrowLeft");
  check("horizontal: a one-emoji section is crossed by Left/Right", right.label !== "lonely" && (await focused(page)).label === "lonely", right.label);
} else check("horizontal: a one-emoji section renders", false, "lonely not found");

await mount(page, { kind: "horizontal" });
await search().fill("heart");
await page.waitForTimeout(200);
const sh0 = await highlighted(page);
await press("ArrowRight");
await press("PageDown");
check("horizontal results: arrows and PageDown move the highlight from the field", (await highlighted(page)) !== sh0 && (await focused(page)).slot === "search-input");

// --- Vertical RTL ------------------------------------------------------------------------
await mount(page, { kind: "vertical", dir: "rtl", root: GRID });
await search().click();
await press("ArrowDown", 200);
const v0 = await rectOf();
await press("ArrowLeft", 200);
const v1 = await rectOf();
check("vertical rtl: Left moves to the next emoji, leftward", v1.left < v0.left && Math.abs(v1.top - v0.top) < 2, `${v0.left} → ${v1.left}`);
await mount(page, { kind: "vertical", dir: "rtl" });
await search().fill("smile");
await page.waitForTimeout(200);
const rh0 = await highlighted(page);
await press("ArrowLeft");
check("results rtl: Left (caret at end) moves the highlight forward", (await highlighted(page)) !== rh0);

// --- Popover --------------------------------------------------------------------------------
await mount(page, { kind: "popover", closeOnSelect: false });
await page.evaluate(() => {
  window.__starting = false;
  new MutationObserver((records) => {
    for (const r of records) for (const n of r.addedNodes) if (n instanceof Element && n.querySelector('[data-slot="popover-content"][data-starting-style]')) window.__starting = true;
  }).observe(document.body, { childList: true, subtree: true });
});
await $('[data-testid="trigger"]').click();
const starting = await page.evaluate(() => window.__starting);
await page.waitForTimeout(60);
const enter = await page.evaluate(() => {
  const el = document.querySelector('[data-slot="popover-content"]');
  return { starting: el.hasAttribute("data-starting-style"), origin: el.style.getPropertyValue("--transform-origin"), animations: el.getAnimations().length };
});
check("popover: mounts with data-starting-style, then transitions in", starting === true && !enter.starting && enter.animations > 0, JSON.stringify(enter));
check("popover: --transform-origin points at the trigger", /^\d+px -?\d+px$/.test(enter.origin), enter.origin);
await page.waitForTimeout(250);
check("popover: the search field is focused once visible", (await focused(page)).slot === "search-input");
await page.keyboard.type("smile");
await page.waitForTimeout(150);
await press("ArrowRight");
const ph = await highlighted(page);
await press("Enter", 250);
check(
  "popover (closeOnSelect=false): Enter picks, stays open, focus and highlight stay",
  (await page.locator('[data-slot="popover-content"]').count()) === 1 && (await focused(page)).slot === "search-input" && (await highlighted(page)) === ph,
);
await press("Escape", 100);
check("popover: Escape with a query clears it first", (await search().inputValue()) === "" && (await page.locator('[data-slot="popover-content"]').count()) === 1);
await press("ArrowDown", 200);
await press("ArrowRight", 150);
const pc = await highlighted(page);
await press("Enter", 300);
check(
  "popover (closeOnSelect=false): Enter on the list's highlight keeps it, focus stays in search",
  pc && (await highlighted(page)) === pc && (await focused(page)).slot === "search-input" && (await page.evaluate(() => window.__picks.length)) === 2,
  pc,
);
await press("Escape", 100); // ends the list's highlight (combobox)
await page.keyboard.press("Escape");
await page.waitForTimeout(30);
const exiting = await page.evaluate(() => {
  const el = document.querySelector('[data-slot="popover-content"]');
  return el && { ending: el.hasAttribute("data-ending-style"), state: el.dataset.state };
});
check("popover: Escape starts the exit (data-ending-style, still mounted)", exiting?.ending === true && exiting.state === "closed", JSON.stringify(exiting));
check("popover: focus returns to the trigger at once", (await focused(page)).slot === "popover-trigger");
await page.waitForTimeout(250);
check("popover: unmounts when the exit transition ends", (await page.locator('[data-slot="popover-content"]').count()) === 0);
await $('[data-testid="trigger"]').click();
await page.waitForTimeout(250);
await page.keyboard.press("Escape");
await page.waitForTimeout(40);
await $('[data-testid="trigger"]').click();
await page.waitForTimeout(40);
const reopened = await page.evaluate(() => {
  const all = document.querySelectorAll('[data-slot="popover-content"]');
  return { count: all.length, ending: all[0]?.hasAttribute("data-ending-style"), opacity: getComputedStyle(all[0]).opacity };
});
check("popover: reopening mid-exit reverses in place", reopened.count === 1 && reopened.ending === false, JSON.stringify(reopened));
await page.waitForTimeout(250);

await mount(page, { kind: "popover", keymap: { close: [] } });
await $('[data-testid="trigger"]').click();
await page.waitForTimeout(250);
await press("Escape", 250);
check("keymap: close: [] leaves Escape to the popover around the picker (it closes, as a sheet would)", (await page.locator('[data-slot="popover-content"]').count()) === 0);

// --- Tapback ------------------------------------------------------------------------------
await mount(page, { kind: "tapback" });
await $('[data-slot="reactions"] button').first().focus();
await press("End");
const lastReaction = await page.evaluate(() => document.activeElement === [...document.querySelectorAll('#harness [data-slot="reactions"] button')].at(-1));
await press("Home");
const firstReaction = await page.evaluate(() => document.activeElement === document.querySelector('#harness [data-slot="reactions"] button'));
check("tapback: End / Home focus the ends of the reaction row", lastReaction && firstReaction);
await press("ArrowRight");
check("tapback: arrows move along the row", (await page.evaluate(() => [...document.querySelectorAll('#harness [data-slot="reactions"] button')].indexOf(document.activeElement))) === 1);

const rowIndex = () => page.evaluate(() => [...document.querySelectorAll('#harness [data-slot="reactions"] button')].indexOf(document.activeElement));
await $('[data-slot="reactions"] button').first().focus();
await $('[data-slot="reactions"] button').nth(2).hover();
await page.waitForTimeout(100);
await press("ArrowRight");
check("tapback: arrows continue from the hovered reaction", (await rowIndex()) === 3, String(await rowIndex()));
await page.mouse.move(0, 0);

// --- Tab stops, Space, Home/End from an empty field, hover in the grid ------------------------
/** Tab from the focused element until focus leaves the harness: what it stopped on. */
const tabStops = async () => {
  const stops = [];
  for (let i = 0; i < 16; i++) {
    await press("Tab", 60);
    const f = await page.evaluate(() => {
      const a = document.activeElement;
      return { inside: !!a?.closest('#harness, [data-slot="popover-content"]'), slot: a?.matches("[data-slot=emoji]") ? "cell" : a?.getAttribute("role") === "tab" ? "tab" : (a?.getAttribute("data-slot") ?? a?.tagName) };
    });
    if (!f.inside) return { left: true, stops };
    stops.push(f.slot);
  }
  return { left: false, stops };
};
const count = (list, x) => list.filter((s) => s === x).length;
await mount(page, { kind: "vertical" });
await search().click();
const pageScroll = await page.evaluate(() => scrollY);
await press("End", 500);
check("empty search field: End highlights the last emoji, focus stays", (await highlighted(page)) === "flag: wales" && (await focused(page)).slot === "search-input", await highlighted(page));
await press("Home", 500);
const homeHl = await highlighted(page);
check("empty search field: Home highlights the first emoji", homeHl != null && homeHl !== "flag: wales" && (await focused(page)).slot === "search-input", homeHl);
check("empty search field: Home/End don't scroll the page", (await page.evaluate(() => scrollY)) === pageScroll);
const tabbable = await page.evaluate(() => [...document.querySelectorAll("#harness [data-slot=emoji]")].filter((c) => c.tabIndex >= 0).length);
check("vertical list: one cell is tabbable (roving tabindex)", tabbable === 1, String(tabbable));
await search().focus();
const fromSearch = await tabStops();
check("Tab from search: the grid and the category tabs are one stop each, then Tab leaves", fromSearch.left && count(fromSearch.stops, "cell") === 1 && count(fromSearch.stops, "tab") === 1, fromSearch.stops.join(", "));

await mount(page, { kind: "vertical", root: GRID });
await search().click();
await press("ArrowDown", 200);
await press("ArrowRight", 150);
const gridHover = await page.evaluate(() => {
  const cells = [...document.querySelectorAll("#harness [data-slot=emoji]")].filter((c) => c.getBoundingClientRect().width > 0);
  const c = cells[18];
  const r = c.getBoundingClientRect();
  return { label: c.getAttribute("aria-label"), x: r.x + r.width / 2, y: r.y + r.height / 2, left: r.x, top: r.y };
});
const gridScroll = await page.evaluate(() => scrollY);
await page.mouse.move(gridHover.x, gridHover.y, { steps: 3 });
await page.waitForTimeout(150);
check("grid: hover leaves the page scroll alone", (await page.evaluate(() => scrollY)) === gridScroll);
await press("ArrowRight", 200);
const afterGridHover = await page.evaluate(() => (({ x, y }) => ({ x, y }))(document.activeElement.getBoundingClientRect()));
check("grid: arrows continue from the hovered emoji", Math.abs(afterGridHover.y - gridHover.top) < 2 && afterGridHover.x > gridHover.left, `${gridHover.label}: ${JSON.stringify(afterGridHover)}`);
const picksBeforeSpace = await page.evaluate(() => window.__picks.length);
await press(" ", 250);
check("grid: Space picks the focused emoji", (await page.evaluate(() => window.__picks.length)) === picksBeforeSpace + 1 && (await focused(page)).slot === "emoji");
await page.mouse.move(0, 0);
await page.evaluate(() => {
  const b = document.createElement("button");
  b.id = "outside";
  b.textContent = "outside";
  document.body.append(b);
  b.focus();
});
await page.mouse.move(gridHover.x, gridHover.y, { steps: 3 });
await page.waitForTimeout(150);
check("grid: hover doesn't take focus from outside the picker", (await page.evaluate(() => document.activeElement.id)) === "outside");
await page.evaluate(() => document.getElementById("outside")?.remove());
await page.mouse.move(0, 0);

await mount(page, { kind: "popover", noSearch: true });
await $('[data-testid="trigger"]').focus();
await press("Enter", 400);
const noSearchOpen = await focused(page);
check("popover without search: focus on the first emoji", noSearchOpen.slot === "emoji", JSON.stringify(noSearchOpen));
await press("ArrowRight", 150);
check("popover without search: arrows move focus between cells", (await focused(page)).slot === "emoji" && (await focused(page)).label !== noSearchOpen.label);
await press("Tab", 150);
const afterGridTab = await page.evaluate(() => [
  document.activeElement.getAttribute("data-slot"),
  document.activeElement.getAttribute("aria-selected"),
  [...document.querySelectorAll('[data-slot="popover-content"] [role=tab][aria-selected=true]')].map((t) => t.getAttribute("aria-label")).join(),
]);
check("popover without search: Tab from the grid goes to the current category tab", afterGridTab[0] === "category-tab" && afterGridTab[1] === "true", JSON.stringify(afterGridTab));
await press("Tab", 300);
check(
  "popover without search: Tab past the last stop leaves the popover and closes it",
  (await focused(page)).slot !== "emoji" && (await page.locator('[data-slot="popover-content"][data-state="open"]').count()) === 0,
  JSON.stringify(await focused(page)),
);
await $('[data-testid="trigger"]').focus();
await press("Enter", 400);
await press("Escape", 300);
check("popover without search: Escape closes, focus back on the trigger", (await focused(page)).slot === "popover-trigger" && (await page.locator('[data-slot="popover-content"]').count()) === 0);

await mount(page, { kind: "popover-row" });
await $('[data-testid="trigger"]').focus();
await press("Enter", 400);
check("popover of buttons (no picker): focus moves to its first button", (await page.evaluate(() => document.activeElement.textContent)) === "👍");
await press("Tab", 100);
await press("Tab", 300);
check(
  "popover: Tab past the content's end goes to what follows the trigger, and closes",
  (await page.evaluate(() => document.activeElement.getAttribute("data-testid"))) === "after" && (await page.locator('[data-slot="popover-content"][data-state="open"]').count()) === 0,
);

// --- Skin tone: Escape closes the options only ------------------------------------------------
await mount(page, { kind: "vertical" });
await search().fill("smile");
await page.waitForTimeout(250);
await page.evaluate(() => {
  window.__escapes = 0;
  document.addEventListener("keydown", (e) => e.key === "Escape" && window.__escapes++);
});
await $('[data-slot="skin-tone"] > button').focus();
await press("Enter", 200);
await press("ArrowRight", 100);
await press("Escape", 200);
check(
  "skin tone: Escape (with search results showing) closes the options, back to the button, and goes no further",
  (await $('[data-slot="skin-tone-option"]').count()) === 0 &&
    (await page.evaluate(() => document.activeElement.parentElement?.getAttribute("data-slot"))) === "skin-tone" &&
    (await page.evaluate(() => window.__escapes)) === 0 &&
    (await search().inputValue()) === "smile",
);
await press("Enter", 200);
await press("ArrowRight", 100);
const toneChosen = await page.evaluate(() => document.activeElement.getAttribute("aria-label"));
await press(" ", 200);
check("skin tone: Space chooses, back to the button", (await page.evaluate(() => document.activeElement.getAttribute("aria-label"))) === toneChosen && (await $('[data-slot="skin-tone-option"]').count()) === 0);
await $('[data-slot="skin-tone"] > button').focus();
await press("Enter", 200);
await press("Home", 100);
await press("Enter", 200);

// --- Twemoji: a missing asset falls back to the native emoji; newer emoji are left out ---
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><circle cx="18" cy="18" r="18" fill="#fc3"/></svg>';
await page.route("**/twemoji@*/assets/svg/**", (route) => (route.request().url().endsWith("/1f600.svg") ? route.fulfill({ status: 404, body: "" }) : route.fulfill({ contentType: "image/svg+xml", body: SVG })));
await mount(page, { kind: "vertical", renderer: "twemoji" });
await page.waitForTimeout(600);
const tw = await page.evaluate(() => {
  const grinning = document.querySelector('#harness [data-slot="emoji"][data-unified="1f600"]');
  const broken = [...document.querySelectorAll("#harness img")].filter((i) => i.complete && i.naturalWidth === 0).length;
  return { fallback: grinning?.querySelector("[data-emoji-fallback]")?.textContent ?? null, broken };
});
check("twemoji: a missing asset shows the native emoji, no broken images", tw.fallback === "😀" && tw.broken === 0, JSON.stringify(tw));
await search().fill("cracking");
await page.waitForTimeout(250);
check("twemoji: emoji newer than the Twemoji set are left out", (await $('[data-slot="emoji"][aria-label="cracking face"]').count()) === 0);
await page.unroute("**/twemoji@*/assets/svg/**");

// --- Artwork overrides ------------------------------------------------------------------------
const art = (color) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="${color}"/></svg>`)}`;
const artwork = { "1f44d": art("blue"), "2764-fe0f": art("red") };
const overridden = (sel) =>
  page.evaluate((sel) => {
    const cell = document.querySelector(sel);
    return cell ? { flag: cell.hasAttribute("data-overridden"), src: cell.querySelector("img")?.getAttribute("src")?.slice(0, 30) ?? null } : null;
  }, sel);
await mount(page, { kind: "vertical", artwork });
const thumbsCell = await overridden('#harness [data-slot="emoji"][data-unified="1f44d"]');
const solo = await page.evaluate(() => {
  const el = document.querySelector('#harness [data-testid="solo"]');
  return { flag: el?.hasAttribute("data-overridden"), label: el?.getAttribute("alt") ?? el?.getAttribute("aria-label") };
});
check(
  "artwork: list cells draw the override (data-overridden), <Emoji> too, any skin tone",
  thumbsCell?.flag && thumbsCell.src?.startsWith("data:image/svg") && solo.flag && solo.label === "thumbs up: medium skin tone",
  JSON.stringify({ thumbsCell, solo }),
);
await $('[data-slot="emoji"][data-unified="1f44d"]').first().click();
check("artwork: picking an overridden emoji selects the standard one", (await page.evaluate(() => window.__picks.at(-1))) === "1f44d");
await search().fill("thumbs up");
await page.waitForTimeout(200);
check("artwork: search results draw it too", (await overridden('#harness [data-results] [data-slot="emoji"][data-index="0"]'))?.flag === true);
await mount(page, { kind: "horizontal", artwork });
check("artwork: the horizontal list draws it", (await overridden('#harness [data-slot="emoji"][data-overridden]')) != null);
await mount(page, { kind: "tapback", artwork });
const reaction = await page.evaluate(() => [...document.querySelectorAll('#harness [data-slot="reactions"] button')].filter((b) => b.hasAttribute("data-overridden")).map((b) => b.getAttribute("aria-label")));
check("artwork: tapback reactions draw it", reaction.length >= 1, reaction.join());

// --- Worst-case data ------------------------------------------------------------------------
const t0 = Date.now();
await mount(page, { kind: "vertical", customs: 500, root: GRID });
const mountMs = Date.now() - t0;
const rendered = await $('[data-slot="emoji"]').count();
check("500 custom emoji: mounts, and only visible rows render", rendered < 400, `${rendered} cells, ${mountMs} ms`);
await search().click();
await press("ArrowDown", 200);
await press("End", 600);
check("500 custom emoji: End reaches the end", (await focused(page)).label === "flag: wales");
await search().fill("pack_49");
await page.waitForTimeout(200);
check("500 custom emoji: search finds them", (await $('[data-slot="emoji"]').count()) >= 11);

// A 1,500-emoji pack: only rows on screen request images; animated ones request their still.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const packRequests = [];
await page.route("**/__pack/**", (route) => {
  const url = new URL(route.request().url());
  if (url.pathname.endsWith("pack.json")) {
    const count = Number(url.searchParams.get("count"));
    const animated = url.searchParams.get("animated") === "1";
    const emojis = Array.from({ length: count }, (_, i) => ({
      id: `frog${i}`,
      name: `frog ${i}`,
      imageUrl: `/__pack/url/frog-${i}.${animated ? "gif" : "png"}`,
      ...(animated ? { animated: true, stillUrl: `/__pack/url/frog-${i}-still.png` } : {}),
      shortcodes: [`frog_${i}`],
      group: "frogs",
    }));
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(emojis) });
  }
  packRequests.push(url.pathname);
  return route.fulfill({ contentType: "image/png", body: PNG });
});
for (const as of ["url", "loader"]) {
  packRequests.length = 0;
  await mount(page, { kind: "vertical", pack: { count: 1500, as, animated: true } });
  await page.waitForTimeout(600);
  const onOpen = packRequests.length;
  await page.evaluate(() => [...document.querySelectorAll('#harness [data-slot="category-tab"]')].find((t) => /frogs/i.test(t.getAttribute("aria-label") ?? ""))?.click());
  await page.waitForTimeout(800);
  const inView = packRequests.length;
  const gifs = packRequests.filter((p) => p.endsWith(".gif")).length;
  check(`1,500-emoji pack (${as}): nothing requested until scrolled to, then only visible rows`, onOpen === 0 && inView > 0 && inView < 150 && gifs === 0, `${onOpen} on open, ${inView} at the pack, ${gifs} animated`);
}
await $('[data-slot="emoji"][aria-label="frog 3"]').hover();
await page.waitForTimeout(300);
check(
  "animated custom emoji: hovering plays it (requests the animation)",
  packRequests.some((p) => p.endsWith("frog-3.gif")),
);
const imgAttrs = await page.evaluate(() => {
  const img = document.querySelector('#harness [data-slot="emoji"] img');
  return img && { loading: img.loading, decoding: img.decoding, width: img.getAttribute("width"), draggable: img.draggable, alt: img.alt };
});
check(
  "custom emoji <img>: lazy, async decode, sized, not draggable, named",
  imgAttrs?.loading === "lazy" && imgAttrs.decoding === "async" && imgAttrs.width && !imgAttrs.draggable && /^frog \d+$/.test(imgAttrs.alt),
  JSON.stringify(imgAttrs),
);
await page.emulateMedia({ reducedMotion: "reduce" });
packRequests.length = 0;
await $('[data-slot="emoji"][aria-label="frog 5"]').hover();
await page.waitForTimeout(300);
check("animated custom emoji: never plays with reduced motion", !packRequests.some((p) => p.endsWith(".gif")), packRequests.join());
await page.emulateMedia({ reducedMotion: "no-preference" });

for (const style of [{}, { "--emoji-image-size": "39px", "--emoji-cell-size": "46px" }]) {
  await mount(page, { kind: "vertical", customs: 40, root: { style } });
  await page.evaluate(() => [...document.querySelectorAll('#harness [data-slot="category-tab"]')].find((t) => /pack/i.test(t.getAttribute("aria-label") ?? ""))?.click());
  await page.waitForTimeout(500);
  const box = await page.evaluate(() => {
    const img = document.querySelector('#harness [data-slot="emoji"] img');
    const b = img.getBoundingClientRect();
    const c = img.closest('[data-slot="emoji"]').getBoundingClientRect();
    return { w: b.width, h: b.height, centered: Math.abs(b.left - c.left - (c.right - b.right)) < 1 };
  });
  const want = style["--emoji-image-size"] ? 39 : 30;
  check(`custom emoji image is --emoji-image-size (${want}px), centered`, box.w === want && box.h === want && box.centered, JSON.stringify(box));
}

await mount(page, { kind: "vertical", longNames: true });
await search().fill("extraordinarily");
await page.waitForTimeout(250);
const layout = await page.evaluate(() => {
  const root = document.querySelector('#harness [data-slot="emoji-picker"]').getBoundingClientRect();
  const footer = document.querySelector('#harness [data-testid="footer"]').getBoundingClientRect();
  return { root: root.width, footer: footer.width, overflow: document.querySelector('#harness [data-slot="emoji-picker"]').scrollWidth - root.width };
});
check("long custom name: the picker and footer keep their width", layout.root === 352 && layout.footer <= 352 && layout.overflow <= 2, JSON.stringify(layout));

await mount(page, { kind: "registry", longNames: true });
await page.waitForTimeout(300);
const regWidth = await page.evaluate(() => document.querySelector("#harness [data-slot=emoji-picker]").getBoundingClientRect().width);
await page.locator("#harness [data-slot=search-input]").fill("tada");
await page.waitForTimeout(200);
check("registry card: stays 328px wide", regWidth === 328, String(regWidth));
await page.locator("#harness [data-slot=search-input]").fill("extraordinarily");
await page.waitForTimeout(250);
const regFooter = await page.evaluate(() => {
  const footer = document.querySelector("#harness [data-slot=emoji-picker] > div:last-of-type");
  return { width: footer.getBoundingClientRect().width, scroll: footer.scrollWidth, client: footer.clientWidth };
});
check("registry footer: a long name and shortcode stay inside", regFooter.scroll <= regFooter.client + 1, JSON.stringify(regFooter), { warn: true });

await mount(page, { kind: "autocomplete", longNames: true });
await page.locator('#harness [data-testid="composer"]').click();
await page.keyboard.type(":an_extraord");
await page.waitForTimeout(250);
const sugg = await page.evaluate(() => {
  const el = document.querySelector('[data-slot="suggestions-popover"]');
  return el ? { width: el.getBoundingClientRect().width, scroll: el.querySelector("ul").scrollWidth, client: el.querySelector("ul").clientWidth } : null;
});
check("autocomplete (demo component): long shortcodes stay inside the menu", sugg && sugg.width <= 321 && sugg.scroll <= sugg.client + 1, JSON.stringify(sugg), { warn: true });

// --- Skin-tone variations (Shift+Space, long press) ------------------------------
const variations = () =>
  page.evaluate((scope) => {
    const row = document.querySelector(`${scope} [data-slot="variations"]`);
    return (
      row && {
        role: row.getAttribute("role"),
        label: row.getAttribute("aria-label"),
        options: [...row.querySelectorAll('[role="option"]')].map((o) => o.getAttribute("aria-label")),
        focus: document.activeElement?.getAttribute("aria-label"),
      }
    );
  }, SCOPE);
await mount(page, { kind: "vertical" });
await search().fill("thumbs up");
await page.waitForTimeout(250);
await press("Shift+Space");
const tones = await variations();
check(
  "variations: Shift+Space on the highlighted emoji opens its six tones, named, the current one focused",
  tones?.role === "listbox" && tones.options.length === 6 && tones.options[0] === "thumbs up" && tones.options[3] === "thumbs up: medium skin tone" && tones.focus === "thumbs up" && (await search().inputValue()) === "thumbs up",
  JSON.stringify(tones),
);
await press("ArrowRight");
check("variations: Right moves to the next tone", (await variations())?.focus === "thumbs up: light skin tone");
await press("End");
check("variations: End goes to the last tone", (await variations())?.focus === "thumbs up: dark skin tone");
await press("Home");
check("variations: Home goes to the first", (await variations())?.focus === "thumbs up");
await press("Escape");
check(
  "variations: Escape closes, back to the field with the emoji highlighted",
  (await variations()) === null && (await focused(page)).slot === "search-input" && (await highlighted(page)) === "thumbs up" && (await search().inputValue()) === "thumbs up",
);
await press("Shift+Space");
await press("ArrowRight");
await press("ArrowRight");
await press("Enter", 300);
check("variations: Enter picks the tone and closes", (await page.evaluate(() => window.__picks.at(-1))) === "1f44d-1f3fc" && (await variations()) === null && (await focused(page)).slot === "search-input");
await mount(page, { kind: "vertical", root: GRID });
await search().fill("waving hand");
await page.waitForTimeout(250);
const waving = await $('[data-slot="list"] [data-slot="emoji"]').first().boundingBox();
await page.mouse.move(waving.x + waving.width / 2, waving.y + waving.height / 2);
await page.mouse.down();
await page.waitForTimeout(700);
const held = await variations();
await page.mouse.up();
await page.waitForTimeout(200);
check(
  "variations: a long press opens them; the release doesn't pick",
  held?.options.length === 6 && held.options[0] === "waving hand" && (await page.evaluate(() => window.__picks.length)) === 0 && (await variations()) !== null,
  JSON.stringify(held),
);
await press("ArrowRight");
await press(" ", 300);
check("variations: Space picks; focus goes back to the emoji's cell (grid)", (await page.evaluate(() => window.__picks.at(-1))) === "1f44b-1f3fb" && (await focused(page)).label === "waving hand" && (await focused(page)).slot === "emoji");
await press("Shift+Space");
check("variations: Shift+Space on a focused cell opens them", (await variations())?.options.length === 6);
await page.mouse.click(5, 5);
await page.waitForTimeout(150);
check("variations: a click outside closes them", (await variations()) === null);
await mount(page, { kind: "vertical", root: { disableVariations: true } });
await search().fill("thumbs up");
await page.waitForTimeout(250);
await press("Shift+Space");
check("variations: disableVariations turns them off (Shift+Space types a space)", (await variations()) === null && (await search().inputValue()) === "thumbs up ");
await search().fill("");

check("no page errors", errors.length === 0, errors.join(" | "));
await browser.close();
const n = failed();
console.log(n ? `\n${n} failed` : "\nall passed");
process.exit(n ? 1 : 0);
