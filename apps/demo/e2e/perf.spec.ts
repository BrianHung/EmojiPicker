// Cost budgets, so refactors can't silently regress them: the heap a picker adds on open (after GC), and the
// React commits and component renders one hover or one ArrowRight costs, counted by a DevTools-hook fiber walk.
import type { CDPSession, Locator, Page } from "@playwright/test";
import { card, preview } from "./surfaces";
import { expect, frames, quiet, test, visit } from "./support";

const BUDGET = { heapMB: 6, commits: 4, renders: 40 };
const STEPS = 20;

declare global {
  interface Window {
    __commits: number;
    __renders: number;
    __names: Record<string, number>;
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__commits = 0;
    window.__renders = 0;
    window.__names = {};
    type Component = { displayName?: string; name?: string; render?: Component };
    type Fiber = { tag: number; flags: number; type: Component | null; child: Fiber | null; sibling: Fiber | null; alternate: Fiber | null };
    const nameOf = (t: Component | null) => t?.displayName || t?.name || t?.render?.displayName || t?.render?.name || "?";
    const walk = (fiber: Fiber) => {
      for (let c = fiber.child; c; c = c.sibling) {
        // Function, forwardRef and memo components that rendered (mounted, or PerformedWork).
        if ((c.tag === 0 || c.tag === 11 || c.tag === 15) && (!c.alternate || c.flags & 1)) {
          window.__renders++;
          window.__names[nameOf(c.type)] = (window.__names[nameOf(c.type)] ?? 0) + 1;
        }
        if (!c.alternate || c.child !== c.alternate.child) walk(c);
      }
    };
    Object.assign(window, {
      __REACT_DEVTOOLS_GLOBAL_HOOK__: {
        renderers: new Map(),
        supportsFiber: true,
        inject: () => 1,
        onScheduleFiberRoot() {},
        onCommitFiberRoot(_: number, root: { current: Fiber }) {
          window.__commits++;
          walk(root.current);
        },
        onCommitFiberUnmount() {},
        onPostCommitFiberRoot() {},
        checkDCE() {},
      },
    });
  });
});

async function heapMB(cdp: CDPSession) {
  await cdp.send("HeapProfiler.collectGarbage");
  await cdp.send("HeapProfiler.collectGarbage");
  return (await cdp.send("Runtime.getHeapUsage")).usedSize / 1048576;
}

async function openDelta(page: Page, open: () => Promise<void>) {
  const cdp = await page.context().newCDPSession(page);
  await quiet(page);
  const before = await heapMB(cdp);
  await open();
  await quiet(page);
  return (await heapMB(cdp)) - before;
}

async function perStep(page: Page, step: (i: number) => Promise<void>) {
  const start = await page.evaluate(() => ((window.__names = {}), [window.__commits, window.__renders]));
  for (let i = 0; i < STEPS; i++) {
    await step(i);
    await frames(page);
  }
  const [commits, renders, names] = await page.evaluate(() => [window.__commits, window.__renders, window.__names] as const);
  const by = Object.fromEntries(Object.entries(names).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / STEPS).toFixed(2)]));
  return { commits: (commits - start[0]!) / STEPS, renders: (renders - start[1]!) / STEPS, by };
}


/** Per hover over STEPS cells in view, then per ArrowRight with the highlight in the grid. */
async function steps(page: Page, root: Locator) {
  await root.scrollIntoViewIfNeeded();
  const cells = await root.evaluate((el) => {
    const view = el.querySelector('[data-slot="viewport"]')!.getBoundingClientRect();
    return [...el.querySelectorAll('[data-slot="list"] [data-slot="emoji"]')]
      .map((c) => c.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.top >= view.top + 48 && r.bottom <= view.bottom)
      .map((r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 }));
  });
  await page.mouse.move(cells[0]!.x, cells[0]!.y);
  await frames(page);
  const hover = await perStep(page, async (i) => page.mouse.move(cells[(i % (cells.length - 1)) + 1]!.x, cells[(i % (cells.length - 1)) + 1]!.y));
  await page.mouse.move(0, 0);
  await root.locator('[data-slot="search-input"]').click();
  await page.keyboard.press("ArrowDown");
  await frames(page);
  const key = await perStep(page, () => page.keyboard.press("ArrowRight"));
  return { hover, key };
}

function record(name: string, value: unknown) {
  test.info().annotations.push({ type: name, description: JSON.stringify(value) });
  console.log(name, JSON.stringify(value));
}

function withinBudget({ hover, key }: Awaited<ReturnType<typeof steps>>) {
  for (const s of [hover, key]) {
    expect(s.commits).toBeLessThanOrEqual(BUDGET.commits);
    expect(s.renders).toBeLessThanOrEqual(BUDGET.renders);
  }
}

test("home: inline picker renders per hover and per ArrowRight", async ({ page }) => {
  await visit(page, "/");
  const result = await steps(page, preview(page, "inline"));
  record("home-inline", result);
  withinBudget(result);
});

test("home: popover picker heap on open", async ({ page }) => {
  await visit(page, "/");
  const trigger = page.locator("section:has(> h3#popover)").getByRole("button", { name: "Open emoji picker", exact: true });
  await trigger.scrollIntoViewIfNeeded();
  const delta = await openDelta(page, async () => {
    await trigger.click();
    await page.locator('[data-slot="popover-content"] [data-slot="emoji"]').first().waitFor();
  });
  record("home-popover-heapMB", +delta.toFixed(2));
  expect(delta).toBeLessThanOrEqual(BUDGET.heapMB);
});

test("gallery: Slack picker renders per step, and heap on open", async ({ page }) => {
  await visit(page, "/gallery/#slack");
  const result = await steps(page, card(page, "Inline picker"));
  record("gallery-slack-inline", result);
  withinBudget(result);
  const trigger = card(page, "Popover").getByRole("button", { name: "Open emoji picker", exact: true });
  await trigger.scrollIntoViewIfNeeded();
  const delta = await openDelta(page, async () => {
    await trigger.click();
    await page.locator('[data-slot="popover-content"] [data-slot="emoji"]').first().waitFor();
  });
  record("gallery-slack-popover-heapMB", +delta.toFixed(2));
  expect(delta).toBeLessThanOrEqual(BUDGET.heapMB);
});

test("bring your own virtualizer: renders per hover and per ArrowRight", async ({ page }) => {
  await visit(page, "/examples/virtualizer/");
  const result = await steps(page, page.locator('[data-slot="emoji-picker"]').first());
  record("byo-tanstack", result);
  expect(result.key.commits).toBeLessThanOrEqual(BUDGET.commits);
});
