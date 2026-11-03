// Shared helpers for the e2e checks: a page on the demo dev server with the harness loaded.
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

export const BASE = process.env.BASE_URL ?? "http://localhost:5199";
const HARNESS = fileURLToPath(new URL("./harness.tsx", import.meta.url));

export async function openHarness() {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("load", () => reloads++);
  // Any page the dev server renders with React works as a host; the harness mounts on top.
  // While the server re-optimizes dependencies (another edit), imports fail: reload and retry.
  for (let attempt = 1; ; attempt++) {
    await page.goto(`${BASE}${process.env.HARNESS_PAGE ?? "/"}`, { waitUntil: "load" });
    try {
      await loadHarness(page);
      break;
    } catch (error) {
      if (attempt >= 6) throw error;
      await page.waitForTimeout(5000);
    }
  }
  errors.length = 0;
  return { browser, page, errors };
}

// A fresh URL each time: after the dev server re-optimizes dependencies, a cached
// transform of the harness would import them by their outdated hashes.
const loadHarness = (page) => page.evaluate((path) => import(/* @vite-ignore */ `/@fs${encodeURI(path)}?t=${Date.now()}`), HARNESS);

export async function mount(page, fixture) {
  // An edit anywhere in the workspace can full-reload the dev page: load the harness again.
  if (!(await page.evaluate(() => Boolean(window.__harness)))) await loadHarness(page);
  await page.evaluate((f) => window.__harness.mount(f), fixture);
  await page.waitForFunction(() => document.querySelectorAll('#harness [data-slot="emoji"]').length > 0 || document.querySelector('#harness [data-testid="trigger"], #harness [data-testid="composer"]'), null, { timeout: 10000 });
  await page.waitForTimeout(150);
}

/** Focused element, for assertions: slot, label, data-index. */
export const focused = (page) =>
  page.evaluate(() => {
    const a = document.activeElement;
    return { slot: a?.getAttribute("data-slot") ?? a?.tagName, label: a?.getAttribute("aria-label"), index: a?.getAttribute("data-index"), unified: a?.getAttribute("data-unified") };
  });

/** The harness and any popover content it portals into the body. */
export const SCOPE = ':is(#harness, [data-slot="popover-content"])';

export const highlighted = (page) => page.evaluate((scope) => document.querySelector(`${scope} [data-slot="emoji"][data-highlighted]`)?.getAttribute("aria-label") ?? null, SCOPE);

let failures = 0;
// Page loads: the first is ours; later ones are the dev server reloading for an edit.
let reloads = 0;
let seenReloads = 1;
/** `warn`: markup outside the library (the demo's components); reported, not failed. */
export function check(name, ok, detail = "", { warn = false } = {}) {
  const reloaded = reloads > seenReloads;
  seenReloads = reloads;
  if (!ok && !warn) failures++;
  const status = ok ? "ok  " : warn ? "WARN" : "FAIL";
  console.log(`${status} ${name}${detail ? `  (${detail})` : ""}${!ok && reloaded ? "  [the dev server reloaded the page during this check: rerun]" : ""}`);
}
export const failed = () => failures;
