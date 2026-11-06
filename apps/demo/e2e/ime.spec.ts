import type { CDPSession, Page } from "@playwright/test";
import { clearTextField, EDITORS, fieldText, firstPicker, listbox, openEditorMenu, surface, tiptapField } from "./surfaces";
import { expect, frames, quiet, slot, test, visit } from "./support";

async function ime(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  return {
    compose: (text: string) => cdp.send("Input.imeSetComposition", { text, selectionStart: text.length, selectionEnd: text.length }),
    press: async (key: string) => {
      await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key, code: key, windowsVirtualKeyCode: 229 });
      await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key, code: key, windowsVirtualKeyCode: 229 });
    },
    commit: (text: string) => (cdp as CDPSession).send("Input.insertText", { text }),
  };
}

const COMPOSERS = ["gallery/slack/scene-autocomplete", "gallery/discord/scene-autocomplete", "gallery/linear/scene-comment-autocomplete", "gallery/apple/scene-autocomplete"].map(surface);

for (const c of COMPOSERS)
  test(`${c.id}: the Enter that commits a composition doesn't send`, async ({ page }) => {
    await visit(page, c.path);
    const field = c.field!(page);
    await field.focus();
    await clearTextField(field);
    await page.keyboard.type("hi ");
    const keys = await ime(page);
    await keys.compose("にほん");
    await keys.press("Enter");
    await keys.commit("日本");
    await frames(page);
    expect(await fieldText(field)).toContain("hi 日本");
  });

test("picker search: arrows, Enter and Escape during a composition stay with the IME", async ({ page }) => {
  await visit(page, "/");
  const picker = firstPicker(page);
  await picker.scrollIntoViewIfNeeded();
  const search = picker.locator("input").first();
  await search.click();
  const highlighted = () => picker.evaluate((p, cell) => p.querySelector(`${cell}[data-highlighted]`)?.getAttribute("aria-label") ?? null, slot("emoji"));
  const keys = await ime(page);
  await keys.compose("smile");
  await quiet(page);
  const before = await highlighted();
  expect(before).not.toBeNull();
  for (const key of ["ArrowDown", "ArrowRight", "Enter", "Escape"]) await keys.press(key);
  await frames(page);
  expect(await highlighted()).toBe(before);
  await expect(page.locator('[data-slot="toast"]')).toHaveCount(0);
  await expect(search).toHaveValue("smile");
  await keys.commit("笑");
  await expect(search).toHaveValue("笑");
});

test("editor menu: arrows and Escape during a composition don't move or close it", async ({ page }) => {
  await visit(page, "/examples/tiptap/");
  const field = tiptapField(page);
  await field.click();
  await page.keyboard.type(":smi", { delay: 40 });
  const menu = page.getByRole("listbox", { name: "Emoji suggestions" });
  await expect(menu).toBeVisible();
  await quiet(page);
  const before = await field.getAttribute("aria-activedescendant");
  const keys = await ime(page);
  await keys.compose("l");
  await keys.press("ArrowDown");
  await keys.press("Escape");
  await frames(page);
  expect(await field.getAttribute("aria-activedescendant")).toBe(before);
  await expect(menu).toBeVisible();
});

for (const e of EDITORS)
  test(`${e.name}: a full-width colon opens the menu, and the Enter that commits a composition doesn't pick`, async ({ page }) => {
    const field = await openEditorMenu(page, e, "：sm");
    const keys = await ime(page);
    await keys.compose("i");
    await keys.press("Enter");
    await keys.commit("i");
    await expect(listbox(page)).toBeVisible();
    expect(await fieldText(field)).toContain("：smi");
    await page.keyboard.press("Enter");
    await expect(listbox(page)).toBeHidden();
    expect(await fieldText(field)).not.toMatch(/：smi$/);
  });
