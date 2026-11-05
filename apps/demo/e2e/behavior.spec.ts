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

// The "Bring your own virtualizer" recipe: useEmojiGrid on TanStack Virtual keeps the List's keyboard.
test("examples/virtualizer", async ({ page }) => {
  await visit(page, "/examples/virtualizer/");
  const root = page.locator('main [data-slot="emoji-picker"]');
  const search = root.locator('[data-slot="search-input"]');
  const viewport = root.locator('[data-slot="viewport"]');
  await search.fill("face");
  const highlighted = async () => (await probe(page, root)).highlight;
  await expect.poll(highlighted).toMatch(/^option /);
  const first = await highlighted();
  for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowDown");
  await stableProbe(page, root);
  const cell = root.locator(`[id="${await search.getAttribute("aria-activedescendant")}"]`);
  const name = (await cell.getAttribute("aria-label"))!;
  expect(await highlighted()).not.toBe(first);
  const [box, frame] = [(await cell.boundingBox())!, (await viewport.boundingBox())!];
  expect(box.y >= frame.y && box.y + box.height <= frame.y + frame.height, "highlight scrolled into view").toBe(true);
  expect(await viewport.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-slot="toast"]').last()).toContainText(name);
});

test("a popover's picker fits a short viewport", async ({ page }, info) => {
  test.skip(viewportOf(info) === "mobile", "the desktop popover");
  await page.setViewportSize({ width: 390, height: 500 });
  await visit(page, "/examples/lexical/");
  await page.getByRole("button", { name: "Insert emoji", exact: true }).click();
  const root = page.locator('[data-slot="popover-content"] [data-slot="emoji-picker"]');
  await root.locator('[data-slot="emoji"]').first().waitFor();
  await quiet(page);
  const box = (await root.boundingBox())!;
  expect([box.y, box.y + box.height].every((y) => y >= 0 && y <= 500), JSON.stringify(box)).toBe(true);
});

/** The highlighted item (the active descendant, the focused item, else [data-highlighted]), marked with `data-e2e`. */
const mark = (root: Locator, name: string) =>
  root.evaluate((el, name) => {
    const active = document.activeElement;
    const id = active?.getAttribute("aria-activedescendant");
    const item = (id && document.getElementById(id)) || (active !== el && el.contains(active) && active?.matches('[data-slot="emoji"], [role="option"]') ? active : el.querySelector("[data-highlighted]"));
    item?.setAttribute("data-e2e", name);
    return item?.getAttribute("aria-label") ?? item?.textContent?.trim() ?? null;
  }, name);

/**
 * How the highlighted item differs from the one it left: the first background, outline or ring that changed (on
 * the item, its pseudo-elements or children), as a contrast ratio over what's behind it (composited sRGB).
 */
const highlightLook = (page: Page) =>
  page.evaluate(() => {
    const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
    const rgba = (color: string) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#0000";
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return [r!, g!, b!, a! / 255];
    };
    const over = ([r, g, b, a]: number[], [R, G, B]: number[]) => [r! * a! + R! * (1 - a!), g! * a! + G! * (1 - a!), b! * a! + B! * (1 - a!), 1];
    const backdrop = (el: Element | null) => {
      const chain: number[][] = [];
      for (let e = el; e; e = e.parentElement) {
        chain.push(rgba(getComputedStyle(e).backgroundColor));
        if (chain.at(-1)![3] === 1) break;
      }
      return chain.reduceRight((under, c) => over(c, under), [255, 255, 255, 1]);
    };
    const lum = (c: number[]) => c.slice(0, 3).reduce((sum, v, i) => sum + [0.2126, 0.7152, 0.0722][i]! * ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4), 0);
    const contrast = (a: number[], b: number[]) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
      return Math.round(((x! + 0.05) / (y! + 0.05)) * 100) / 100;
    };
    const parts = (el: Element) => [el, ...el.children].flatMap((e) => [null, "::before", "::after"].map((p) => ({ e, s: getComputedStyle(e, p) })));
    const ring = (s: CSSStyleDeclaration) =>
      s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0 ? s.outlineColor : ([...s.boxShadow.matchAll(/(?:rgba?|oklab|oklch|lab|lch|color)\([^)]*\)/g)].map((m) => m[0]).find((c) => rgba(c)[3]! > 0) ?? null);
    const [now, before] = [document.querySelector("[data-e2e=after]")!, document.querySelector("[data-e2e=before]")];
    if (!before) return { kind: "none", contrast: 0, detail: "the previous item is gone" };
    const [a, b] = [parts(now), parts(before)];
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const [x, y] = [a[i]!, b[i]!];
      const [rx, ry] = [ring(x.s), ring(y.s)];
      if (rx && (rx !== ry || x.s.outlineStyle !== y.s.outlineStyle || x.s.boxShadow !== y.s.boxShadow)) {
        const behind = backdrop(x.e);
        return { kind: "ring", contrast: contrast(over(rgba(rx), behind), behind), detail: `ring ${rx} (was ${ry ?? "none"})` };
      }
      if (x.s.backgroundColor !== y.s.backgroundColor) {
        const [ca, cb] = [rgba(x.s.backgroundColor), rgba(y.s.backgroundColor)];
        const behind = backdrop(x.e.parentElement);
        return { kind: ca[3] === 1 && cb[3] === 1 ? "solid" : "wash", contrast: contrast(over(ca, behind), over(cb, behind)), detail: `background ${x.s.backgroundColor} (was ${y.s.backgroundColor})` };
      }
    }
    return { kind: "none", contrast: 1, detail: "no background, outline or ring changed" };
  });

/** iOS's emoji keyboard stays up while you type. */
const KEEPS_OPEN = ["gallery/apple/scene-composer"];
/** The trigger goes with the pick: focus moves to the message (iMessage), the bar's opener (Instagram) or the picked reaction (tapback). */
const FOCUS_MOVES = ["gallery/apple/scene-tapback-more", "home/hero-apple-tapback-more", "gallery/instagram/scene-reaction-more", "home/tapback-more"];

// From the keyboard: Enter on the trigger opens it with focus inside, an arrow visibly moves the highlight,
// and Enter picks and closes it, with focus back on the trigger (or the field a composer inserted into).
for (const s of SURFACES.filter((s) => s.trigger || s.kind === "menu"))
  test(`keyboard: ${s.id}`, async ({ page }, info) => {
    test.skip(!!s.only && s.only !== viewportOf(info), `${s.only} only`);
    test.skip(viewportOf(info) === "mobile" && s.id === "gallery/instagram/scene-reaction-more", "on a phone its bar opens by long-press, with nothing to give focus back to");
    await visit(page, s.path);
    await s.prepare?.(page);
    const root = s.root(page);
    let back: Locator;
    if (s.trigger) {
      back = s.trigger(page);
      await back.focus();
      await page.keyboard.press("Enter");
      await root.locator('[data-slot="emoji"], [role="option"]').first().waitFor();
    } else back = await s.open(page);
    await quiet(page);
    await page.mouse.move(0, 0);
    const inside = (el: Element) => {
      const active = document.activeElement!;
      const id = active.getAttribute("aria-activedescendant");
      return (el !== active && el.contains(active)) || (!!id && el.contains(document.getElementById(id)));
    };
    expect(await root.evaluate(inside), "focus is inside").toBe(true);

    const key = s.kind === "menu" ? "ArrowDown" : "ArrowRight";
    if (!(await mark(root, "before"))) await page.keyboard.press("ArrowDown");
    const from = await mark(root, "before");
    await page.keyboard.press(key);
    await quiet(page);
    expect(await mark(root, "after"), `${key} moves the highlight`).not.toBe(from);
    const look = await highlightLook(page);
    info.annotations.push({ type: "highlight", description: `${look.kind} ${look.contrast}:1, ${look.detail}` });
    expect(look.kind, look.detail).not.toBe("none");
    expect(look.contrast, look.detail).toBeGreaterThanOrEqual(look.kind === "ring" ? 3 : look.kind === "solid" ? 1.5 : 1.05);

    await page.keyboard.press("Enter");
    if (!KEEPS_OPEN.includes(s.id)) await expect(page.locator("[data-e2e=after]")).toBeHidden();
    await quiet(page);
    const landed = await page.evaluate(() => (document.activeElement?.matches('[contenteditable="true"], input, textarea') ? "field" : document.activeElement === document.body ? "body" : "other"));
    expect((await holdsFocus(back)) || landed === "field" || (FOCUS_MOVES.includes(s.id) && landed !== "body"), `focus after picking: ${(await probe(page, root)).focus}`).toBe(true);
  });
