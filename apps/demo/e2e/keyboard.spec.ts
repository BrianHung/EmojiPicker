import type { Locator, Page } from "@playwright/test";
import { PAGE_SCROLLS } from "./known-issues";
import { fieldText, show, surface, type Kind, type Surface } from "./surfaces";
import { expect, fileName, probe, quiet, emojiItem, slot, test, viewportOf, visit, type Probe } from "./support";

const REPRESENTATIVE = [
  "home/inline-tailwind",
  "gallery/slack/popover",
  "home/popover",
  "gallery/discord/popover-no-search",
  "gallery/discord/scene-reaction",
  "gallery/slack/scene-autocomplete",
  "examples/tiptap/menu",
  "examples/lexical/menu",
  "gallery/notion/scene-colon-menu",
  "gallery/apple/scene-tapback-more",
  "home/tapback-more",
  "gallery/instagram/scene-reaction-bar",
];

const KEYS: Record<Kind, string[]> = {
  picker: ["ArrowDown", "ArrowRight", "ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "End", "Home", "PageDown", "PageUp"],
  menu: ["ArrowDown", "ArrowDown", "ArrowUp", "ArrowUp", "ArrowUp", "ArrowDown"],
  bar: ["ArrowRight", "ArrowRight", "ArrowLeft", "End", "Home", "ArrowDown", "ArrowUp"],
};
const CONTINUE: Record<Kind, string> = { picker: "ArrowRight", menu: "ArrowDown", bar: "ArrowRight" };
const ITEM: Record<Kind, string> = { picker: emojiItem, menu: '[role="option"]', bar: "button" };
const FOCUS_MOVES = ["gallery/apple/scene-tapback-more", "home/tapback-more"];

type Step = Probe & { key: string; scrolled: number };

const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));
const isOpen = (root: Locator) => root.isVisible();
const holdsFocus = (target: Locator) => target.evaluate((el) => el === document.activeElement, null, { timeout: 500 }).catch(() => false);

// Settled once focus and highlight read the same 100 ms apart
async function stableProbe(page: Page, root: Locator): Promise<Probe> {
  let last: Probe | undefined;
  await expect
    .poll(
      async () => {
        const next = await probe(page, root);
        const same = last !== undefined && next.focus === last.focus && next.highlight === last.highlight;
        last = next;
        return same;
      },
      { intervals: [100], timeout: 2_000 },
    )
    .toBe(true);
  return last!;
}

async function press(page: Page, root: Locator, key: string): Promise<Step> {
  const before = await scrollY(page);
  await page.keyboard.press(key);
  return { key, ...(await stableProbe(page, root)), scrolled: Math.sign((await scrollY(page)) - before) };
}

async function fresh(page: Page, s: Surface): Promise<[Locator, Locator]> {
  const { back, root } = await show(page, s, { interact: true });
  await page.mouse.move(0, 0);
  return [back!, root];
}

async function outcome(page: Page, root: Locator, back: Locator) {
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

const mark = (root: Locator, name: string) =>
  root.evaluate(
    (el, [name, cell]) => {
      const active = document.activeElement;
      const id = active?.getAttribute("aria-activedescendant");
      const item = (id && document.getElementById(id)) || (active !== el && el.contains(active) && active?.matches(`${cell}, [role="option"]`) ? active : el.querySelector("[data-highlighted]"));
      item?.setAttribute("data-e2e", name);
      return item?.getAttribute("aria-label") ?? item?.textContent?.trim() ?? null;
    },
    [name, emojiItem] as const,
  );

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

async function fromKeyboard(page: Page, s: Surface) {
  await visit(page, s.path);
  await s.prepare?.(page);
  const root = s.root(page);
  let back: Locator;
  if (s.trigger) {
    back = s.trigger(page);
    await back.focus();
    await page.keyboard.press("Enter");
    await root.locator(`${emojiItem}, [role="option"]`).first().waitFor();
  } else back = await s.open(page);
  await quiet(page);
  await page.mouse.move(0, 0);
  const inside = await root.evaluate((el) => {
    const active = document.activeElement!;
    const id = active.getAttribute("aria-activedescendant");
    return (el !== active && el.contains(active)) || (!!id && el.contains(document.getElementById(id)));
  });
  expect(inside, "focus is inside").toBe(true);
  const key = s.kind === "menu" ? "ArrowDown" : "ArrowRight";
  if (!(await mark(root, "before"))) await page.keyboard.press("ArrowDown");
  const from = await mark(root, "before");
  await page.keyboard.press(key);
  await quiet(page);
  expect(await mark(root, "after"), `${key} moves the highlight`).not.toBe(from);
  const look = await highlightLook(page);
  expect(look.kind, look.detail).not.toBe("none");
  expect(look.contrast, look.detail).toBeGreaterThanOrEqual(look.kind === "ring" ? 3 : look.kind === "solid" ? 1.5 : 1.05);

  await page.keyboard.press("Enter");
  await expect(page.locator("[data-e2e=after]")).toBeHidden();
  await quiet(page);
  const landed = await page.evaluate(() => (document.activeElement?.matches('[contenteditable="true"], input, textarea') ? "field" : document.activeElement === document.body ? "body" : "other"));
  expect((await holdsFocus(back)) || landed === "field" || (FOCUS_MOVES.includes(s.id) && landed !== "body"), `focus after picking: ${(await probe(page, root)).focus}`).toBe(true);
}

for (const s of REPRESENTATIVE.map(surface))
  test(s.id, async ({ page }, info) => {
    test.skip(!!s.only && s.only !== viewportOf(info), `${s.only} only`);
    const touch = viewportOf(info) === "mobile";
    const record: Record<string, unknown> = {};

    let [back, root] = await fresh(page, s);
    record.opened = await stableProbe(page, root);
    const keys: Step[] = [];
    for (const key of KEYS[s.kind]) keys.push(await press(page, root, key));
    record.keys = keys;
    record.enter = (await page.keyboard.press("Enter"), await outcome(page, root, back));

    if (!touch) {
      [back, root] = await fresh(page, s);
      await root
        .locator(ITEM[s.kind])
        .nth(s.kind === "picker" ? 11 : 1)
        .hover({ force: true });
      record.hover = { hovered: await stableProbe(page, root), then: await press(page, root, CONTINUE[s.kind]) };
    }

    [back, root] = await fresh(page, s);
    const escapes = [];
    for (let i = 0; i < 2 && (i === 0 || (await isOpen(root))); i++) escapes.push((await page.keyboard.press("Escape"), await outcome(page, root, back)));
    record.escape = escapes;

    [back, root] = await fresh(page, s);
    await page.keyboard.press("Tab");
    await quiet(page);
    record.tab = { ...(await probe(page, root)), open: await isOpen(root), inside: await root.evaluate((el) => el.contains(document.activeElement), null, { timeout: 500 }).catch(() => false) };

    expect(`${JSON.stringify(record, null, 2)}\n`).toMatchSnapshot(`${fileName(s.id)}.json`);
    expect(
      keys.filter((k) => k.scrolled !== 0).map((k) => k.key),
      "keys that scrolled the page",
    ).toEqual(PAGE_SCROLLS[`${viewportOf(info)}:${s.id}`] ?? []);

    if (s.trigger || s.kind === "menu") await fromKeyboard(page, s);
  });

test("search: arrows move the highlight with the caret at the end of the query, and the caret within it", async ({ page }) => {
  await visit(page, "/");
  const root = surface("home/inline-tailwind").root(page);
  const search = root.locator(slot("searchInput"));
  await search.fill("smile");
  const highlight = async () => (await probe(page, root)).highlight;
  await expect.poll(highlight).not.toBeNull();
  const first = await highlight();
  await page.keyboard.press("ArrowRight");
  await expect.poll(highlight).not.toBe(first);
  const second = await highlight();
  await search.evaluate((i: HTMLInputElement) => i.setSelectionRange(2, 2));
  await page.keyboard.press("ArrowRight");
  expect(await search.evaluate((i: HTMLInputElement) => i.selectionStart)).toBe(3);
  expect(await highlight()).toBe(second);
});

test("search: aria-activedescendant names an option in the list after Escape and after a query change, and follows the first arrow", async ({ page }) => {
  await visit(page, "/");
  const root = surface("home/inline-tailwind").root(page);
  const search = root.locator(slot("searchInput"));
  const active = () =>
    search.evaluate((el) => {
      const id = el.getAttribute("aria-activedescendant");
      return id ? (document.getElementById(id)?.getAttribute("aria-label") ?? "missing") : null;
    });
  await search.fill("smile");
  await expect.poll(active).not.toBeNull();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect.poll(active).not.toBe("missing");
  await page.keyboard.press("PageDown");
  await expect.poll(active).not.toBeNull();
  await search.fill("a");
  expect(await active()).not.toBe("missing");
  await expect.poll(active).not.toBeNull();
  const before = await active();
  await page.keyboard.press("ArrowRight");
  await expect.poll(active).not.toBe(before);
  expect(await active()).toBe(await root.locator("[data-highlighted]").getAttribute("aria-label"));
});

test("Shift+Space on a result opens its skin tones, and Enter picks the toned emoji", async ({ page }) => {
  await visit(page, "/");
  const root = surface("home/inline-tailwind").root(page);
  await root.locator(slot("searchInput")).fill("thumbs up");
  await expect.poll(async () => (await probe(page, root)).highlight).toContain("thumbs up");
  await page.keyboard.press("Shift+Space");
  await expect(root.locator(`${slot("listVariations")} [role="option"]`)).toHaveCount(6);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-slot="toast"]').last()).toContainText("👍🏼");
  await expect(root.locator(slot("listVariations"))).toHaveCount(0);
  await expect(root.locator(slot("searchInput"))).toBeFocused();
});

test("examples/virtualizer", async ({ page }) => {
  await visit(page, "/examples/virtualizer/");
  const root = page.locator(`main ${slot("root")}`);
  const search = root.locator(slot("searchInput"));
  const viewport = root.locator(slot("viewport"));
  await search.fill("face");
  const highlighted = async () => (await probe(page, root)).highlight;
  await expect.poll(highlighted).toMatch(/^option /);
  const first = await highlighted();
  for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowDown");
  await stableProbe(page, root);
  const cell = root.locator(`[id="${await search.getAttribute("aria-activedescendant")}"]`);
  const name = (await cell.getAttribute("aria-label"))!;
  expect(await highlighted()).not.toBe(first);
  await expect(cell, "highlight scrolled into view").toBeInViewport({ ratio: 1 });
  expect(await viewport.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-slot="toast"]').last()).toContainText(name);
});

test("the registry picker draws a focus ring on the skin tone button and the focused emoji", async ({ page }) => {
  await visit(page, "/");
  await surface("home/popover").trigger!(page).click();
  for (const name of ["Default skin tone", "thumbs up"]) {
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toHaveAttribute("aria-label", name);
    expect(await focused.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("solid");
  }
});

