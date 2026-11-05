// The `:` menu on each kind of editor the site has: Tiptap and Lexical (the example pages), a
// textarea (Slack's composer) and a grid menu (Notion's page). From the keyboard, near the caret,
// focus staying in the editor, IME-safe, and axe-clean with the menu open.
import AxeBuilder from "@axe-core/playwright";
import type { Locator, Page } from "@playwright/test";
import { isKnown } from "./a11y/known";
import { card, caretToEnd, clearTextField } from "./surfaces";
import { expect, frames, test, visit } from "./support";

/** `gap`: how far from the caret the menu may open (Notion's grid menu sits below the line). */
type Editor = { name: string; path: string; field: (p: Page) => Locator; trigger: string; gap?: number };

const EDITORS: Editor[] = [
  { name: "Tiptap", path: "/examples/tiptap/", field: (p) => p.locator("main [contenteditable=true]").first(), trigger: ":smi" },
  { name: "Lexical", path: "/examples/lexical/", field: (p) => p.getByLabel("Editor", { exact: true }), trigger: ":smi" },
  { name: "Textarea (Slack)", path: "/gallery/#slack", field: (p) => card(p).getByLabel("Message #general", { exact: true }), trigger: ":smi" },
  { name: "Grid menu (Notion)", path: "/gallery/#notion", field: (p) => card(p).getByLabel("Page content", { exact: true }), trigger: ":sm", gap: 64 },
];

const menu = (page: Page) => page.getByRole("listbox").filter({ visible: true }).and(page.locator(":not([data-slot=list])")).last();
const text = (field: Locator) => field.evaluate((el) => (el instanceof HTMLTextAreaElement ? el.value : (el.textContent ?? "")));
const focused = (field: Locator) => field.evaluate((el) => el.contains(document.activeElement));

/** Gap in px between the menu and the caret (a textarea: the field), 0 when they touch. */
const caretGap = (field: Locator, box: { x: number; y: number; width: number; height: number }) =>
  field.evaluate((el, box) => {
    const r = el instanceof HTMLTextAreaElement ? el.getBoundingClientRect() : getSelection()!.getRangeAt(0).getBoundingClientRect();
    return Math.hypot(Math.max(box.x - r.right, r.left - (box.x + box.width), 0), Math.max(box.y - r.bottom, r.top - (box.y + box.height), 0));
  }, box);

async function open(page: Page, e: Editor, trigger = e.trigger) {
  await visit(page, e.path);
  const field = e.field(page);
  await field.click();
  await clearTextField(field);
  await caretToEnd(field);
  await page.keyboard.type(trigger, { delay: 40 });
  await menu(page).getByRole("option").first().waitFor();
  return field;
}

for (const e of EDITORS) {
  test(`${e.name}: opens at the caret, moves, inserts and closes from the keyboard`, async ({ page }) => {
    const field = await open(page, e);
    expect(await caretGap(field, (await menu(page).boundingBox())!)).toBeLessThan(e.gap ?? 24);
    await expect(field).toHaveAttribute("aria-expanded", "true");

    const first = await field.getAttribute("aria-activedescendant");
    await page.keyboard.press("ArrowDown");
    await frames(page);
    const second = await field.getAttribute("aria-activedescendant");
    expect(second).not.toBe(first);
    const background = (id: string) => page.locator(`[id="${id}"]`).evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(await background(second!)).not.toBe(await background(first!));

    const before = await text(field);
    await page.keyboard.press("Enter");
    await expect(menu(page)).toBeHidden();
    await expect.poll(() => text(field)).not.toBe(before);
    expect(await text(field)).not.toMatch(new RegExp(`${e.trigger}$`));
    expect(await focused(field)).toBe(true);

    await page.keyboard.type(e.trigger, { delay: 40 });
    await expect(menu(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu(page)).toBeHidden();
    expect(await text(field)).toContain(e.trigger);
    expect(await focused(field)).toBe(true);
  });

  test(`${e.name}: a full-width colon triggers, and the Enter that commits an IME composition doesn't pick`, async ({ page }) => {
    const field = await open(page, e, "：sm");
    const ime = await page.context().newCDPSession(page);
    await ime.send("Input.imeSetComposition", { text: "i", selectionStart: 1, selectionEnd: 1 });
    await ime.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 229 });
    await ime.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 229 });
    await ime.send("Input.insertText", { text: "i" });
    await expect(menu(page)).toBeVisible();
    expect(await text(field)).toContain("：smi");
    await page.keyboard.press("Enter");
    await expect(menu(page)).toBeHidden();
    expect(await text(field)).not.toMatch(/：smi$/);
  });

  // The menu itself (the page and editors around it are audited in a11y/axe.spec.ts).
  test(`${e.name}: axe, menu open`, async ({ page }) => {
    await open(page, e);
    await menu(page).evaluate((el) => el.setAttribute("data-axe-scope", ""));
    const { violations } = await new AxeBuilder({ page }).include("[data-axe-scope]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
    const fresh = violations.flatMap((v) => v.nodes.filter((n) => !isKnown(v.id, n.target.join(" "), n.html)).map((n) => `${v.id} ${n.target.join(" ")} ${n.html.slice(0, 160)}`));
    expect(fresh).toEqual([]);
  });
}
