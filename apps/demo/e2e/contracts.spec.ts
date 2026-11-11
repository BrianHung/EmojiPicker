import { expect, slot, test, visit } from "./support";

// The docs' own snippets and demos, from e2e/pages/contracts
let errors: Error[] = [];
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on("pageerror", (e) => errors.push(e));
  await visit(page, "/e2e/pages/contracts/");
});
test.afterEach(() => expect(errors).toEqual([]));

const offline = (on: boolean) => ((window as { offline?: boolean }).offline = on);

test("composer: a controlled textarea takes a suggestion, survives Backspace under the menu, and leaves Cmd+Enter to the page", async ({ page }) => {
  const field = page.getByRole("region", { name: "Composer" }).getByLabel("Message");
  const menu = page.getByRole("listbox", { name: "Emoji suggestions" });
  await field.click();
  await page.keyboard.type("ok :tada");
  await expect(menu).toBeVisible();
  await page.keyboard.press("Backspace");
  await expect(menu.getByRole("option").first()).toContainText(":tada:");
  await page.evaluate(() => document.addEventListener("keydown", (e) => e.key === "Enter" && (document.body.dataset.prevented = String(e.defaultPrevented))));
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(page.locator("body")).toHaveAttribute("data-prevented", "false");
  await page.keyboard.press("Enter");
  await expect(field).toHaveValue("ok 🎉 ");
  await expect(menu).toBeHidden();
});

test("inline picker: arrows move the result highlight, Tab lands on it, and Escape clears the query", async ({ page }) => {
  const root = page.getByRole("region", { name: "Inline" });
  const search = root.getByRole("searchbox");
  await search.fill("cat");
  await page.keyboard.press("ArrowRight");
  const highlighted = await root.locator("[data-highlighted]").getAttribute("data-key");
  await page.keyboard.press("Tab");
  await expect(root.getByRole("button", { name: "Default skin tone" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(root.locator(`[data-key="${highlighted}"]`)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(search).toHaveValue("");
});

test("reaction row: a pick from a search collapses the row, and expanding again starts with an empty query", async ({ page }) => {
  const root = page.getByRole("region", { name: "Reactions" });
  const expand = root.getByRole("button", { name: "More emoji" });
  const search = root.getByRole("searchbox");
  await expand.click();
  await search.fill("rocket");
  await page.keyboard.press("Enter");
  await expect(page.locator("#picked")).toHaveText("🚀");
  await expect(search).toBeHidden();
  await expand.click();
  await expect(search).toHaveValue("");
});

for (const name of ["Base UI", "React Aria", "Floating UI"])
  test(`${name} popover item: focus starts in the search field, the first Escape clears the query and the next closes, a pick closes, and focus returns to the trigger`, async ({ page }) => {
    const trigger = page.getByRole("region", { name: `${name} popover` }).getByRole("button", { name: "Open emoji picker" });
    const popup = page.getByRole("dialog");
    const search = popup.getByRole("searchbox");
    await trigger.click();
    await expect(search).toBeFocused();
    await page.keyboard.type("rocket");
    await page.keyboard.press("Escape");
    await expect(search).toHaveValue("");
    await expect(search).toBeFocused();
    // Once focus leaves the closing popup, it can't come back while the popup animates out
    const field = (await search.elementHandle())!;
    await page.keyboard.press("Escape");
    const refocused = await field.evaluate(async (el) => {
      for (let i = 0; i < 30 && document.activeElement === el; i++) await new Promise(requestAnimationFrame);
      el.focus();
      return document.activeElement === el;
    });
    expect(refocused).toBe(false);
    await expect(trigger).toBeFocused();
    await expect(popup).toHaveCount(0);
    await trigger.press("Enter");
    await expect(search).toBeFocused();
    await page.keyboard.type("rocket");
    await page.keyboard.press("Enter");
    await expect(page.locator("#picked")).toHaveText("🚀");
    await expect(popup).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

test("composer: the menu follows the query when the textarea itself scrolls, and hides once the query scrolls out", async ({ page }) => {
  const field = page.getByRole("region", { name: "Composer" }).getByLabel("Message");
  const menu = page.getByRole("listbox", { name: "Emoji suggestions" });
  await field.evaluate((el) => Object.assign(el.style, { height: "80px", overflow: "auto" }));
  await field.click();
  await page.keyboard.type("1\n2\n3\n4\n5\n6\n7 :tada");
  await expect(menu).toBeVisible();
  const top = (await menu.boundingBox())!.y;
  const scrolled = await field.evaluate((el) => {
    const before = el.scrollTop;
    el.scrollTop -= 8;
    return before - el.scrollTop;
  });
  await expect.poll(async () => (await menu.boundingBox())?.y).toBe(top + scrolled);
  await field.evaluate((el) => (el.scrollTop = 0));
  await expect(menu).toBeHidden();
});

test("popover item with content and finalFocus: the given parts render, focus starts in the list, and a pick returns focus to the field", async ({ page }) => {
  await page.getByRole("button", { name: "Insert emoji" }).click();
  const popup = page.getByRole("dialog");
  await expect(popup.getByRole("searchbox")).toHaveCount(0);
  await expect(popup.locator(slot("listCell")).first()).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(popup).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Draft" })).toBeFocused();
});

test("search failure: the empty state offers a retry, the live region gives no count, and the retry recovers", async ({ page }) => {
  const root = page.getByRole("region", { name: "Search" });
  const status = root.locator(slot("searchStatus"));
  await page.evaluate(offline, true);
  await root.getByRole("searchbox").fill("cat");
  const retry = root.getByRole("button", { name: "Search failed. Try again" });
  await expect(retry).toBeVisible();
  await expect(status).toHaveText("");
  await page.evaluate(offline, false);
  await retry.click();
  await expect(root.getByRole("option").first()).toBeVisible();
  await expect(status).toHaveText(/\d/);
});
