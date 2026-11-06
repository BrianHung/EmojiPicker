import type { Page } from "@playwright/test";
import { clearTextField, SURFACES } from "./surfaces";
import { expect, frames, quiet, settle, test, visit } from "./support";

const picker = (page: Page) => page.locator('[data-slot="emoji-picker"]').first();
const highlighted = (page: Page) => picker(page).locator('[data-slot="emoji-picker-emoji"][data-highlighted]');

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

test("moving up never hides the highlighted emoji under a sticky section title", async ({ page }) => {
  await visit(page, "/");
  await focusSearch(page);
  for (let i = 0; i < 8; i++) await page.keyboard.press("PageDown");
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("ArrowUp");
    await frames(page);
    const hidden = await picker(page).evaluate((root) => {
      const cell = root.querySelector('[data-slot="emoji-picker-emoji"][data-highlighted]')?.getBoundingClientRect();
      if (!cell) return null;
      const top = root.querySelector('[data-slot="emoji-picker-viewport"]')!.getBoundingClientRect().top;
      return Math.max(
        0,
        ...[...root.querySelectorAll('[data-slot="emoji-picker-section-title"]')]
          .map((h) => h.getBoundingClientRect())
          .filter((h) => Math.abs(h.top - top) < 2)
          .map((h) => Math.min(cell.bottom, h.bottom) - Math.max(cell.top, h.top)),
      );
    });
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
  const composer = page.locator('[data-slot="card"]').first().getByLabel("Message #general", { exact: true });
  await composer.click();
  await clearTextField(composer);
  await page.keyboard.type(":smi", { delay: 40 });
  expect(await page.getByRole("listbox", { name: "Emoji suggestions" }).locator("[data-highlighted]").evaluate(outline)).toBe("solid 2px");
});

for (const id of ["gallery/slack/popover-no-search", "gallery/slack/popover"])
  test(`${id}: a pinned section title sits flush with the top, padding or not`, async ({ page }) => {
    const surface = SURFACES.find((s) => s.id === id)!;
    await visit(page, surface.path);
    await surface.open(page);
    await quiet(page);
    const gap = await surface
      .root(page)
      .locator('[data-slot="emoji-picker-viewport"]')
      .first()
      .evaluate(async (viewport) => {
        viewport.scrollBy(0, 330);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const top = viewport.getBoundingClientRect().top;
        const pinned = [...viewport.querySelectorAll('[data-slot="emoji-picker-section-title"]')].map((h) => h.getBoundingClientRect()).find((r) => r.top <= top + 12 && r.bottom > top);
        return pinned ? pinned.top - top : null;
      });
    expect(gap).toBe(0);
  });

test("a popover's picker fits a short viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 500 });
  await visit(page, "/examples/lexical/");
  await page.getByRole("button", { name: "Insert emoji", exact: true }).click();
  const root = page.locator('[data-slot="emoji-picker-popover-content"] [data-slot="emoji-picker"]');
  await root.locator('[data-slot="emoji-picker-emoji"]').first().waitFor();
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
