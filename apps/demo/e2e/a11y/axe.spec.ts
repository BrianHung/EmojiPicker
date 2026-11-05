// axe-core (WCAG 2.2 A/AA + best practice) on every page, and on every picker surface in
// ../surfaces.ts opened. Zero violations, apart from the explicit allowlist in ./known.ts.
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { STYLES, SURFACES } from "../surfaces";
import { expect, settle, test, viewportOf, visit } from "../support";
import { isKnown } from "./known";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

const PAGES = ["/", ...STYLES.map((s) => `/gallery/#${s}`), "/examples/", "/examples/tiptap/", "/examples/lexical/", "/examples/semantic-search/", "/examples/custom-emoji/", "/examples/virtualizer/"];

/** Waits out open/close transitions so contrast is measured on the final colours. */
async function still(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {})),
    ),
  );
  await settle(page);
}

/** Violations not in the allowlist, one line per node (also attached to the report as JSON). */
async function audit(page: Page, include?: string) {
  await still(page);
  let builder = new AxeBuilder({ page }).withTags(TAGS);
  if (include) builder = builder.include(include);
  const { violations } = await builder.analyze();
  const found = violations.flatMap((v) => v.nodes.map((n) => ({ rule: v.id, impact: v.impact, target: n.target.join(" "), html: n.html.slice(0, 200), help: v.help })));
  const fresh = found.filter((f) => !isKnown(f.rule, f.target, f.html));
  await test.info().attach("axe-violations.json", { body: JSON.stringify({ fresh, known: found.length - fresh.length }, null, 2), contentType: "application/json" });
  return fresh.map((f) => `${f.rule} (${f.impact}) ${f.target} — ${f.help}\n    ${f.html}`);
}

for (const path of PAGES)
  test(`page ${path}`, async ({ page }) => {
    await visit(page, path);
    expect(await audit(page)).toEqual([]);
  });

for (const s of SURFACES)
  test(s.id, async ({ page }, info) => {
    test.skip(!!s.only && s.only !== viewportOf(info), `${s.only} only`);
    await visit(page, s.path);
    await s.prepare?.(page);
    if (!s.inline) await s.open(page);
    // Scope to the open surface (the page around it is covered above); inline ones to their frame.
    const scope = s.inline ? (s.frame ?? s.root)(page) : s.root(page);
    await scope.evaluate((el) => el.setAttribute("data-axe-scope", ""));
    expect(await audit(page, "[data-axe-scope]")).toEqual([]);
  });
