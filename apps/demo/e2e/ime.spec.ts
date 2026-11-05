// Japanese and Chinese input: while an IME composes, its keys (the Enter that commits, arrows over candidates,
// Escape that cancels) belong to the IME, so nothing sends, picks, moves or closes.
import type { CDPSession, Locator, Page } from "@playwright/test";
import { card, clearTextField } from "./surfaces";
import { expect, frames, quiet, test, visit } from "./support";

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

const text = (field: Locator) => field.evaluate((el) => (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value : (el.textContent ?? "")));

const COMPOSERS = [
  { name: "Slack", path: "/gallery/#slack", label: "Message #general" },
  { name: "Discord", path: "/gallery/#discord", label: "Message #general" },
  { name: "Linear", path: "/gallery/#linear", label: "Leave a comment" },
  { name: "iMessage", path: "/gallery/#apple", label: "Message" },
];

for (const c of COMPOSERS)
  test(`${c.name}: the Enter that commits a composition doesn't send`, async ({ page }) => {
    await visit(page, c.path);
    const field = card(page).getByLabel(c.label, { exact: true });
    await field.focus();
    await clearTextField(field);
    await page.keyboard.type("hi ");
    const keys = await ime(page);
    await keys.compose("にほん");
    await keys.press("Enter");
    await keys.commit("日本");
    await frames(page);
    expect(await text(field)).toContain("hi 日本");
  });

test("picker search: arrows, Enter and Escape during a composition stay with the IME", async ({ page }) => {
  await visit(page, "/");
  const picker = page.locator('[data-slot="emoji-picker"]').first();
  await picker.scrollIntoViewIfNeeded();
  const search = picker.locator("input").first();
  await search.click();
  const highlighted = () => picker.evaluate((p) => p.querySelector('[data-slot="emoji"][data-highlighted]')?.getAttribute("aria-label") ?? null);
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
  const field = page.locator("main [contenteditable=true]").first();
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
