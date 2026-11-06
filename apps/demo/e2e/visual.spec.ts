import type { Locator, Page } from "@playwright/test";
import { SHOTS, SURFACES, show } from "./surfaces";
import { expect, fileName, settle, test, viewportOf, visit } from "./support";

async function shoot(page: Page, id: string, frame: Locator, mask: Locator[] = []) {
  await frame.scrollIntoViewIfNeeded();
  await settle(page);
  await expect(frame).toHaveScreenshot(`${fileName(id)}.png`, { mask });
}

for (const shot of SHOTS)
  test(shot.id, async ({ page }, info) => {
    test.skip(!!shot.only && shot.only !== viewportOf(info), `${shot.only} only`);
    await visit(page, shot.path);
    await shot.prepare?.(page);
    await shoot(page, shot.id, shot.frame(page), shot.mask?.(page));
  });

for (const s of SURFACES)
  test(s.id, async ({ page }, info) => {
    test.skip(!!s.only && s.only !== viewportOf(info), `${s.only} only`);
    await show(page, s);
    await shoot(page, s.id, (s.frame ?? s.root)(page));
  });
