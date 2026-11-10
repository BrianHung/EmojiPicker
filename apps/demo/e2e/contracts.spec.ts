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

test("popover: Escape closes it and returns focus to the trigger, and the closing popup can't take focus", async ({ page }) => {
  const trigger = page.getByRole("region", { name: "Popover" }).getByRole("button", { name: "Open emoji picker" });
  await trigger.click();
  const input = page.locator(`${slot("popoverPopup")} ${slot("searchInput")}`);
  await expect(input).toBeFocused();
  // Escape, then focus in the first frame of the exit animation
  const focused = await input.evaluate(async (el) => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    for (let i = 0; i < 30 && !el.closest("[data-ending-style]"); i++) await new Promise(requestAnimationFrame);
    el.focus();
    return [el.closest("[data-ending-style]") !== null, document.activeElement === el];
  });
  expect(focused).toEqual([true, false]);
  await expect(trigger).toBeFocused();
  await expect(page.locator(slot("popoverPopup"))).toHaveCount(0);
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
