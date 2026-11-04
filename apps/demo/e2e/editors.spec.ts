// The editors page: every editor × every app's ":" menu completes `:smi` from the keyboard,
// with the caret staying in the editor, and axe-clean with a menu open.
import AxeBuilder from "@axe-core/playwright";
import type { Locator, Page } from "@playwright/test";
import { isKnown } from "./a11y/known";
import { expect, frames, test, visit } from "./support";

const EDITORS = ["Textarea", "Tiptap", "Lexical", "ProseMirror", "Contenteditable"];
const EXPERIENCES = ["Slack", "Discord", "Notion", "Linear"];
const AXE = { Slack: "Tiptap", Discord: "Lexical", Notion: "ProseMirror", Linear: "Contenteditable" } as Record<string, string>;

const menu = (page: Page) => page.getByRole("listbox", { name: "Emoji suggestions" });
const highlighted = (page: Page) => menu(page).locator("[data-highlighted]");

/** The emoji an option shows: native text, or a Twemoji image's code points. */
const emojiOf = (option: Locator) =>
  option.locator("[data-emoji]").evaluate((el) => {
    const src = el.querySelector("img")?.getAttribute("src") ?? (el as HTMLImageElement).src;
    const text = el.textContent?.trim();
    return text || String.fromCodePoint(...src!.match(/([0-9a-f-]+)\.(svg|png)/)![1]!.split("-").map((h) => parseInt(h, 16)));
  });

/** Gap in px between the menu and the caret's rect (0 when they touch). */
const caretGap = (field: Locator, box: { x: number; y: number; width: number; height: number }) =>
  field.evaluate((el, box) => {
    const r = el instanceof HTMLTextAreaElement ? new DOMRect(el.getBoundingClientRect().left + 16, el.getBoundingClientRect().top + 12, 1, 22) : getSelection()!.getRangeAt(0).getBoundingClientRect();
    const dx = Math.max(box.x - r.right, r.left - (box.x + box.width), 0);
    const dy = Math.max(box.y - r.bottom, r.top - (box.y + box.height), 0);
    return Math.hypot(dx, dy);
  }, box);

const text = (field: Locator) => field.evaluate((el) => (el instanceof HTMLTextAreaElement ? el.value : el.textContent ?? "").replace(/️/g, ""));
const focused = (field: Locator) => field.evaluate((el) => el.contains(document.activeElement));

async function open(page: Page, editor: string, experience: string) {
  await visit(page, "/examples/editors/");
  await page.getByRole("tablist", { name: "Editor" }).getByRole("tab", { name: editor, exact: true }).click();
  await page.getByRole("tablist", { name: "Experience" }).getByRole("tab", { name: experience, exact: true }).click();
  const field = page.locator('[aria-label="Message"]');
  await field.click();
  await page.keyboard.type(":smi", { delay: 40 });
  await expect(menu(page)).toBeVisible();
  return field;
}

for (const editor of EDITORS)
  for (const experience of EXPERIENCES)
    test(`${editor} × ${experience}`, async ({ page }) => {
      const field = await open(page, editor, experience);
      const card = menu(page).locator("xpath=ancestor-or-self::*[@data-style][1]");
      expect(await caretGap(field, (await card.boundingBox())!)).toBeLessThan(24);
      await expect(field).toHaveAttribute("role", "combobox");
      await expect(field).toHaveAttribute("aria-expanded", "true");
      await expect(field).toHaveAttribute("aria-controls", (await menu(page).getAttribute("id"))!);

      const first = await field.getAttribute("aria-activedescendant");
      await expect(highlighted(page)).toHaveAttribute("id", first!);
      await page.keyboard.press("ArrowDown");
      await frames(page);
      const second = await field.getAttribute("aria-activedescendant");
      expect(second).not.toBe(first);
      await expect(highlighted(page)).toHaveAttribute("id", second!);
      const background = (id: string) => page.locator(`[id="${id}"]`).evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(await background(second!)).not.toBe(await background(first!));

      const expected = (await emojiOf(highlighted(page))).replace(/️/g, "");
      await page.keyboard.press("Enter");
      await expect(menu(page)).toBeHidden();
      await expect.poll(() => text(field)).toContain(expected);
      expect(await text(field)).not.toContain(":smi");
      expect(await focused(field)).toBe(true);
      await expect(field).not.toHaveAttribute("aria-expanded");

      await page.keyboard.type(":smi", { delay: 40 });
      await expect(menu(page)).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(menu(page)).toBeHidden();
      expect(await text(field)).toMatch(/:smi$/);
      expect(await focused(field)).toBe(true);
    });

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

for (const experience of EXPERIENCES)
  test(`axe: ${AXE[experience]} × ${experience}, menu open`, async ({ page }) => {
    await open(page, AXE[experience]!, experience);
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const fresh = violations.flatMap((v) => v.nodes.filter((n) => !isKnown(v.id, n.target.join(" "), n.html)).map((n) => `${v.id} ${n.target.join(" ")} ${n.html.slice(0, 160)}`));
    expect(fresh).toEqual([]);
  });
