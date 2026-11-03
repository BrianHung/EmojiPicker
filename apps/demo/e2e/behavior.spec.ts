// Keyboard and ARIA behaviour of every surface in surfaces.ts, recorded as JSON in
// e2e/fixtures/<project>/<surface>.json (reviewable; regenerate with `npm run test:behavior -- -u`)
// and an ARIA snapshot of the open surface. Each phase starts from a fresh load.
import type { Locator, Page } from "@playwright/test";
import { PAGE_SCROLLS } from "./known-issues";
import { SURFACES, type Kind, type Surface } from "./surfaces";
import { expect, fileName, matchFixture, probe, quiet, test, viewportOf, visit, type Probe } from "./support";

/**
 * The navigation keys, in order, per kind of surface. A `:` menu owns only ArrowUp/Down: the other keys
 * belong to its text field (caret moves, and on macOS Home/End/PageUp/PageDown scroll the page).
 */
const KEYS: Record<Kind, string[]> = {
  picker: ["ArrowDown", "ArrowRight", "ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "End", "Home", "PageDown", "PageUp"],
  menu: ["ArrowDown", "ArrowDown", "ArrowUp", "ArrowUp", "ArrowUp", "ArrowDown"],
  bar: ["ArrowRight", "ArrowRight", "ArrowLeft", "End", "Home", "ArrowDown", "ArrowUp"],
};
/** After hovering an item, this key should continue from it. */
const CONTINUE: Record<Kind, string> = { picker: "ArrowRight", menu: "ArrowDown", bar: "ArrowRight" };
const ITEM: Record<Kind, string> = { picker: '[data-slot="emoji"]', menu: '[role="option"]', bar: "button" };

type Step = Probe & { key: string; scrolled: number };

const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));
const isOpen = (root: Locator) => root.isVisible();
// The trigger may unmount on pick (iMessage's tapback pill): then it holds nothing.
const holdsFocus = (target: Locator) => target.evaluate((el) => el === document.activeElement, null, { timeout: 500 }).catch(() => false);
const fieldText = (target: Locator) =>
  target
    .evaluate((el) => (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value : (el as HTMLElement).isContentEditable ? el.textContent : null), null, { timeout: 500 })
    .catch(() => null);

/** Probes until two reads 100 ms apart agree: Page/Home/End scroll a virtualized grid, then move focus. */
async function stableProbe(page: Page, root: Locator): Promise<Probe> {
  let last = await probe(page, root);
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(100);
    const next = await probe(page, root);
    if (next.focus === last.focus && next.highlight === last.highlight) return next;
    last = next;
  }
  return last;
}

async function press(page: Page, root: Locator, key: string): Promise<Step> {
  const before = await scrollY(page);
  await page.keyboard.press(key);
  return { key, ...(await stableProbe(page, root)), scrolled: (await scrollY(page)) - before };
}

/** Fresh load, then open: [where focus returns, the open surface]. */
async function fresh(page: Page, s: Surface): Promise<[Locator, Locator]> {
  await visit(page, s.path);
  await s.prepare?.(page);
  const back = await s.open(page);
  await quiet(page);
  // Park the pointer off the surface: a grid that opens under it would take a hover highlight.
  await page.mouse.move(0, 0);
  return [back, s.root(page)];
}

/** What picking did: a toast (the site's onSelect), the text field's contents, and where focus went. */
async function outcome(page: Page, root: Locator, back: Locator) {
  // A closing surface counts as closed once it's gone (up to 1.5 s), then its exit transition settles.
  await root.waitFor({ state: "hidden", timeout: 1_500 }).catch(() => {});
  await quiet(page);
  const toast = page.locator('[data-slot="toast"]').last();
  const field = await fieldText(back);
  return {
    open: await isOpen(root),
    focus: (await probe(page, root)).focus,
    focusReturned: await holdsFocus(back),
    toast: (await toast.count()) ? (await toast.innerText()).replace(/\s+/g, " ").trim() : null,
    ...(field != null ? { field: field.replace(/\s+/g, " ").trim().slice(-80) } : {}),
  };
}

for (const s of SURFACES)
  test(s.id, async ({ page }, info) => {
    test.skip(!!s.only && s.only !== viewportOf(info), `${s.only} only`);
    const touch = viewportOf(info) === "mobile";
    const record: Record<string, unknown> = {};

    // Open: focus, ARIA tree, the key trace, then Enter picks the highlighted item.
    let [back, root] = await fresh(page, s);
    record.opened = await stableProbe(page, root);
    await expect(root).toMatchAriaSnapshot({ name: `${fileName(s.id)}.aria.yml` });
    const keys: Step[] = [];
    for (const key of KEYS[s.kind]) keys.push(await press(page, root, key));
    record.keys = keys;
    record.enter = (await page.keyboard.press("Enter"), await outcome(page, root, back));

    // Hover (pointer devices only), then the keyboard continues from the hovered item.
    if (!touch) {
      [back, root] = await fresh(page, s);
      const item = root.locator(ITEM[s.kind]).nth(s.kind === "picker" ? 11 : 1);
      // Forced: some menus re-render their options while open, so they never count as "stable".
      await item.hover({ force: true });
      record.hover = { hovered: await stableProbe(page, root), then: await press(page, root, CONTINUE[s.kind]) };
    }

    // Escape (twice if the first only clears something), and where focus lands.
    [back, root] = await fresh(page, s);
    const escapes = [];
    for (let i = 0; i < 2 && (i === 0 || (await isOpen(root))); i++) escapes.push((await page.keyboard.press("Escape"), await outcome(page, root, back)));
    record.escape = escapes;

    // Tab: where focus goes next and whether the surface stays open.
    [back, root] = await fresh(page, s);
    await page.keyboard.press("Tab");
    await quiet(page);
    record.tab = { ...(await probe(page, root)), open: await isOpen(root), inside: await root.evaluate((el) => el.contains(document.activeElement), null, { timeout: 500 }).catch(() => false) };

    matchFixture(info, fileName(s.id), record);
    // Keyboard moves never scroll the page (the surface's own scroller may).
    expect(keys.filter((k) => k.scrolled !== 0).map((k) => k.key), "keys that scrolled the page").toEqual(PAGE_SCROLLS[`${info.project.name}:${s.id}`] ?? []);
  });
