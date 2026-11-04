// The grid in modes the other specs don't cover: right-to-left, sticky section titles while
// moving up, and Windows high contrast (forced colors), where backgrounds are dropped.
import type { Page } from "@playwright/test";
import { SURFACES } from "./surfaces";
import { expect, frames, quiet, test, visit } from "./support";

const picker = (page: Page) => page.locator('[data-slot="emoji-picker"]').first();
const highlighted = (page: Page) => picker(page).locator('[data-slot="emoji"][data-highlighted]');

async function focusSearch(page: Page) {
  await picker(page).scrollIntoViewIfNeeded();
  await picker(page).locator("input").first().click();
  await page.keyboard.press("ArrowDown");
}

test("right-to-left: the grid mirrors and ArrowLeft moves to the next emoji", async ({ page }) => {
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

test("moving up never hides the highlighted emoji under a sticky section title", async ({ page }) => {
  await visit(page, "/");
  await focusSearch(page);
  for (let i = 0; i < 8; i++) await page.keyboard.press("PageDown");
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("ArrowUp");
    await frames(page);
    const hidden = await picker(page).evaluate((root) => {
      const cell = root.querySelector('[data-slot="emoji"][data-highlighted]')?.getBoundingClientRect();
      if (!cell) return null;
      const top = root.querySelector('[data-slot="viewport"]')!.getBoundingClientRect().top;
      return Math.max(0, ...[...root.querySelectorAll('[data-slot="category-header"]')].map((h) => h.getBoundingClientRect()).filter((h) => Math.abs(h.top - top) < 2).map((h) => Math.min(cell.bottom, h.bottom) - Math.max(cell.top, h.top)));
    });
    if (hidden === null) break;
    expect(hidden).toBe(0);
  }
});

test("forced colors: the highlighted emoji and suggestion keep a visible outline", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  const outline = (el: Element) => getComputedStyle(el).outlineStyle + " " + getComputedStyle(el).outlineWidth;
  await visit(page, "/");
  await focusSearch(page);
  expect(await highlighted(page).evaluate(outline)).toBe("solid 2px");

  await visit(page, "/gallery/#slack");
  await page.locator('[data-slot="card"]').first().getByLabel("Message #general", { exact: true }).click();
  await page.keyboard.type(":smi", { delay: 40 });
  expect(await page.getByRole("listbox", { name: "Emoji suggestions" }).locator("[data-highlighted]").evaluate(outline)).toBe("solid 2px");
});

for (const id of ["gallery/slack/popover-no-search", "gallery/slack/popover"])
  test(`${id}: a pinned section title sits flush with the top, padding or not`, async ({ page }) => {
    const surface = SURFACES.find((s) => s.id === id)!;
    await visit(page, surface.path);
    await surface.open(page);
    await quiet(page);
    const gap = await surface.root(page).locator('[data-slot="viewport"]').first().evaluate(async (viewport) => {
      viewport.scrollBy(0, 330);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const top = viewport.getBoundingClientRect().top;
      const pinned = [...viewport.querySelectorAll('[data-slot="category-header"]')].map((h) => h.getBoundingClientRect()).find((r) => r.top <= top + 12 && r.bottom > top);
      return pinned ? pinned.top - top : null;
    });
    expect(gap).toBe(0);
  });
