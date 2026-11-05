import type { Locator } from "@playwright/test";
import { EDITORS, listbox, openEditorMenu } from "./surfaces";
import { expect, test } from "./support";

const caretGap = (field: Locator, box: { x: number; y: number; width: number; height: number }) =>
  field.evaluate((el, box) => {
    const r = el instanceof HTMLTextAreaElement ? el.getBoundingClientRect() : getSelection()!.getRangeAt(0).getBoundingClientRect();
    return Math.hypot(Math.max(box.x - r.right, r.left - (box.x + box.width), 0), Math.max(box.y - r.bottom, r.top - (box.y + box.height), 0));
  }, box);

for (const e of EDITORS)
  test(`${e.name}: the menu opens at the caret`, async ({ page }) => {
    const field = await openEditorMenu(page, e);
    expect(await caretGap(field, (await listbox(page).boundingBox())!)).toBeLessThan(e.gap ?? 24);
  });

for (const e of EDITORS)
  test(`${e.name}: a pick counts once in frequently used`, async ({ page }) => {
    await openEditorMenu(page, e);
    await page.keyboard.press("Enter");
    await expect(listbox(page)).toBeHidden();
    const scores = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem("emoji-picker:frequents") ?? "{}") as Record<string, { count: number }>).map(({ count }) => Math.round(count)));
    expect(scores).toEqual([1]);
  });
