import type { Locator, Page } from "@playwright/test";
import sharp from "sharp";
import { card, clearTextField, firstPicker as picker, show, surface } from "./surfaces";
import { expect, frames, quiet, settle, slot, test, visit } from "./support";

const highlighted = (page: Page) => picker(page).locator(`${slot("emoji")}[data-highlighted]`);

async function focusSearch(page: Page) {
  await picker(page).scrollIntoViewIfNeeded();
  await picker(page).locator("input").first().click();
  await page.keyboard.press("ArrowDown");
}

test.describe("right-to-left", () => {
  test.use({ locale: "ar" });
  test("the grid mirrors and ArrowLeft moves to the next emoji", async ({ page }) => {
    await page.addInitScript(() => document.addEventListener("DOMContentLoaded", () => (document.documentElement.dir = "rtl")));
    await visit(page, "/");
    await focusSearch(page);
    const first = (await highlighted(page).boundingBox())!;
    const firstName = await highlighted(page).getAttribute("aria-label");
    await page.keyboard.press("ArrowLeft");
    const next = (await highlighted(page).boundingBox())!;
    expect(next.x).toBeLessThan(first.x);
    expect(await highlighted(page).getAttribute("aria-label")).not.toBe(firstName);
    await page.keyboard.press("ArrowRight");
    expect(await highlighted(page).getAttribute("aria-label")).toBe(firstName);
  });
});

const SELECTORS = { emoji: slot("emoji"), viewport: slot("viewport"), title: slot("sectionTitle") };

test("moving up never hides the highlighted emoji under a sticky section title", async ({ page }) => {
  await visit(page, "/");
  await focusSearch(page);
  for (let i = 0; i < 8; i++) await page.keyboard.press("PageDown");
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("ArrowUp");
    await frames(page);
    const hidden = await picker(page).evaluate((root, { emoji, viewport, title }) => {
      const cell = root.querySelector(`${emoji}[data-highlighted]`)?.getBoundingClientRect();
      if (!cell) return null;
      const top = root.querySelector(viewport)!.getBoundingClientRect().top;
      return Math.max(
        0,
        ...[...root.querySelectorAll(title)]
          .map((h) => h.getBoundingClientRect())
          .filter((h) => Math.abs(h.top - top) < 2)
          .map((h) => Math.min(cell.bottom, h.bottom) - Math.max(cell.top, h.top)),
      );
    }, SELECTORS);
    if (hidden === null) break;
    expect(hidden).toBe(0);
  }
});

test("forced colors: the highlighted emoji and suggestion keep a visible outline", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  const outline = (el: Element) => `${getComputedStyle(el).outlineStyle} ${getComputedStyle(el).outlineWidth}`;
  await visit(page, "/");
  await focusSearch(page);
  expect(await highlighted(page).evaluate(outline)).toBe("solid 2px");

  await visit(page, "/gallery/#slack");
  const composer = card(page).getByLabel("Message #general", { exact: true });
  await composer.click();
  await clearTextField(composer);
  await page.keyboard.type(":smi", { delay: 40 });
  expect(await page.getByRole("listbox", { name: "Emoji suggestions" }).locator("[data-highlighted]").evaluate(outline)).toBe("solid 2px");
});

for (const id of ["gallery/slack/popover-no-search", "gallery/slack/popover", "home/hero-notion"])
  test(`${id}: a pinned section title covers the top edge, padding or not`, async ({ page }) => {
    const { root } = await show(page, surface(id), { interact: true });
    const viewport = root.locator(slot("viewport")).first();
    const gap = await viewport.evaluate(async (el, title) => {
      el.scrollTop = 374.5;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const top = el.getBoundingClientRect().top;
      const pinned = [...el.querySelectorAll(title)].map((h) => h.getBoundingClientRect()).find((r) => r.top <= top + 12 && r.bottom > top);
      return pinned ? pinned.top - top : null;
    }, slot("sectionTitle"));
    expect(gap).toBeLessThanOrEqual(0);
    expect(gap).toBeGreaterThan(-1);
    const box = (await viewport.boundingBox())!;
    const shot = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.width - 16, height: 1 }, scale: "device" });
    const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
    let leaked = 0;
    for (let i = 0; i < data.length; i += info.channels) if (Math.max(data[i]!, data[i + 1]!, data[i + 2]!) - Math.min(data[i]!, data[i + 1]!, data[i + 2]!) > 60) leaked++;
    expect(leaked, "emoji pixels above the pinned title").toBe(0);
  });

test("a popover's picker fits a short viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 500 });
  await visit(page, "/examples/lexical/");
  await page.getByRole("button", { name: "Insert emoji", exact: true }).click();
  const root = page.locator(`${slot("popoverContent")} ${slot("root")}`);
  await root.locator(slot("emoji")).first().waitFor();
  await quiet(page);
  const box = (await root.boundingBox())!;
  expect(
    [box.y, box.y + box.height].every((y) => y >= 0 && y <= 500),
    JSON.stringify(box),
  ).toBe(true);
});

test("a native emoji takes the image's box whatever the font", async ({ page }) => {
  await visit(page, "/");
  const section = page.locator("section:has(> h3#rendering)");
  const glyph = section.locator("[data-emoji]").filter({ visible: true }).first();
  const box = async (renderer: string, font: string) => {
    await section.getByRole("tablist", { name: "Renderer" }).getByRole("tab", { name: renderer }).click();
    await section.getByRole("tablist", { name: "Font" }).getByRole("tab", { name: font }).click();
    await settle(page);
    const [b, p] = await Promise.all([glyph.boundingBox(), glyph.locator("xpath=..").boundingBox()]);
    return { x: b!.x - p!.x, y: b!.y - p!.y, width: b!.width, height: b!.height };
  };
  const image = await box("Images", "System");
  for (const font of ["System", "Twemoji", "Noto"]) expect(await box("Native", font), font).toEqual(image);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

async function pressUntilFocused(page: Page, target: Locator, key: string) {
  for (let i = 0; i < 10 && !(await target.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press(key);
  await expect(target).toBeFocused();
}

test("swapped parts: a shadcn menu on useSkinTone and Base UI tabs on useCategoryNavigation, named by useEmojiLabels, drive the grid and expand a collapsed section", async ({ page }) => {
  await visit(page, "/e2e/pages/seams/");
  const root = page.locator(slot("root"));
  const search = root.locator(slot("searchInput"));
  await root.locator(slot("emoji")).first().waitFor();

  await search.focus();
  await page.keyboard.press("Tab");
  const trigger = root.getByRole("button", { name: "Default skin tone" });
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  const medium = page.getByRole("menuitemradio", { name: "Medium skin tone", exact: true });
  await pressUntilFocused(page, medium, "ArrowDown");
  await page.keyboard.press("Enter");
  await expect(root.getByRole("button", { name: "Medium skin tone" })).toBeFocused();
  await search.fill("thumbs up");
  await expect(root.locator(slot("emoji")).first()).toHaveAttribute("data-unified", "1f44d-1f3fd");
  await search.fill("");

  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const tabs = root.getByRole("tablist", { name: "Category navigation" });
  await expect(tabs.locator('[aria-selected="true"]')).toBeFocused();
  const animals = tabs.getByRole("tab", { name: "Animals & Nature" });
  await pressUntilFocused(page, animals, "ArrowRight");
  await page.keyboard.press("Enter");
  await expect(animals).toHaveAttribute("aria-selected", "true");
  const offset = (name: string) =>
    root.locator(slot("viewport")).evaluate(
      (viewport, [name, selector]) => {
        const title = [...viewport.querySelectorAll(selector!)].find((t) => t.textContent === name);
        return title ? Math.round(title.getBoundingClientRect().top - viewport.getBoundingClientRect().top) : null;
      },
      [name, slot("sectionTitle")],
    );
  await expect.poll(() => offset("Animals & Nature")).toBe(0);

  const flags = tabs.getByRole("tab", { name: "Flags" });
  await pressUntilFocused(page, flags, "ArrowRight");
  await page.keyboard.press("Enter");
  await expect.poll(() => offset("Flags")).toBe(0);
  await expect(root.locator(`${slot("emoji")}[data-unified="1f3c1"]`)).toBeVisible();
});

test("Slack: the reaction picker fades out where it was when its hover toolbar hides on pick", async ({ page }) => {
  await visit(page, "/gallery/#slack");
  const scene = card(page);
  await scene.scrollIntoViewIfNeeded();
  await scene.getByText(/^yep/).hover();
  await scene.getByRole("button", { name: "Add reaction" }).last().click();
  const content = page.locator(slot("popoverContent"));
  await content.locator(slot("emoji")).first().waitFor();
  await settle(page);
  // The placed offsets, not the rect: the exit animation's own transform is fine
  const sampling = content.evaluate(async (el) => {
    const seen = new Set<string>();
    for (let i = 0; i < 60 && el.isConnected; i++) {
      const { left, top } = getComputedStyle(el);
      seen.add(`${left} ${top}`);
      await new Promise((r) => requestAnimationFrame(r));
    }
    return [...seen];
  });
  const at = await content.evaluate((el) => `${getComputedStyle(el).left} ${getComputedStyle(el).top}`);
  await content.locator(slot("emoji")).nth(5).click();
  expect(await sampling).toEqual([at]);
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("iMessage: the message stays visible while the tapback closes", async ({ page }) => {
    await visit(page, "/gallery/#apple");
    const scene = page.locator("[data-imessage]").first();
    const tapbacks = scene.getByRole("toolbar", { name: "Tapbacks" });
    await expect(tapbacks).toBeVisible();
    const bubble = scene.locator('[aria-label^="They: perfect"]').first();
    await tapbacks.getByRole("button", { name: "Like", exact: true }).tap();
    const unseen = await bubble.evaluate(async (el) => {
      let frames = 0;
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        const lifted = el.closest("[data-imessage]")!.querySelector(".z-20");
        if (getComputedStyle(el).visibility === "hidden" && (!lifted || +getComputedStyle(lifted).opacity < 0.5)) frames++;
      }
      return frames;
    });
    expect(unseen).toBe(0);
  });
});
