import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test as base, expect, type Locator, type Page, type Route, type TestInfo } from "@playwright/test";

const DIR = fileURLToPath(new URL(".", import.meta.url));
const CACHE = `${DIR}.cache/`;
const REMOTE_IMAGE = readFileSync(`${DIR}fixtures/remote-image.png`);

export { expect };

export type Viewport = "desktop" | "mobile";
export const viewportOf = (info: TestInfo): Viewport => (info.project.use.isMobile ? "mobile" : "desktop");

async function fromCache(route: Route) {
  const file = CACHE + createHash("sha1").update(route.request().url()).digest("hex");
  if (existsSync(file) && existsSync(`${file}.json`)) {
    const { status, headers } = JSON.parse(readFileSync(`${file}.json`, "utf8"));
    return route.fulfill({ status, headers, body: readFileSync(file) });
  }
  const response = await route.fetch();
  const body = await response.body();
  if (response.ok()) {
    mkdirSync(CACHE, { recursive: true });
    const headers = { "content-type": response.headers()["content-type"] ?? "application/octet-stream", "access-control-allow-origin": "*" };
    const tmp = `${file}.${process.pid}.tmp`;
    writeFileSync(tmp, body);
    renameSync(tmp, file);
    writeFileSync(`${file}.json`, JSON.stringify({ status: response.status(), headers }));
  }
  return route.fulfill({ response, body });
}

export const test = base.extend({
  page: async ({ page, colorScheme }, use) => {
    await page.addInitScript(
      (theme) => {
        if (!sessionStorage.getItem("e2e")) localStorage.clear();
        sessionStorage.setItem("e2e", "1");
        localStorage.setItem("demo:theme", theme);
      },
      colorScheme === "dark" ? "dark" : "light",
    );
    await page.route(/^https:\/\/all-the\.bufo\.zone\/|\/api\/bufo-still\//, (route) => route.fulfill({ contentType: "image/png", body: REMOTE_IMAGE }));
    await page.route(/^https:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//, fromCache);
    await use(page);
  },
});

export async function visit(page: Page, path: string) {
  if (page.url() !== "about:blank") await page.goto("about:blank");
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const dark = await page.evaluate(() => localStorage.getItem("demo:theme") === "dark");
  await expect(page.locator("html")).toHaveClass(dark ? /\bdark\b/ : /^(?!.*\bdark\b)/);
  await settle(page);
}

export const frames = (page: Page) => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));

export async function quiet(page: Page) {
  await settle(page);
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getComputedTiming().iterations === Infinity), null, { timeout: 3_000 }).catch(() => {});
  await page.waitForTimeout(150);
  await frames(page);
}

export async function settle(page: Page) {
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].every((l) => l.sheet), null, { timeout: 15_000 });
  await frames(page);
  await page.waitForFunction(() => document.fonts.ready.then(() => [...document.fonts].every((f) => f.status !== "loading")), null, { timeout: 15_000 });
  await page.waitForFunction(
    () =>
      [...document.images].every((img) => {
        const r = img.getBoundingClientRect();
        const onScreen = r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
        return !onScreen || (img.complete && img.naturalWidth > 0);
      }),
    null,
    { timeout: 15_000 },
  );
  await frames(page);
}

export async function hold(page: Page, target: Locator, ms = 700) {
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

export type Probe = { focus: string; highlight: string | null };

export async function probe(page: Page, root: Locator): Promise<Probe> {
  await frames(page);
  const el = await root.elementHandle({ timeout: 500 }).catch(() => null);
  return page.evaluate((rootEl) => {
    const describe = (e: Element | null) => {
      if (!e || e === document.body) return "body";
      const role = e.getAttribute("role") || e.tagName.toLowerCase();
      const name = (e.getAttribute("aria-label") || e.getAttribute("title") || e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 48);
      const unified = (e as HTMLElement).dataset?.unified;
      return `${role} "${name}"${unified ? ` ${unified}` : ""}`;
    };
    const active = document.activeElement;
    const id = active?.getAttribute("aria-activedescendant");
    const target = (id && document.getElementById(id)) || rootEl?.querySelector("[data-highlighted]") || null;
    return { focus: describe(active), highlight: target ? describe(target) : null };
  }, el);
}

export const fileName = (id: string) => id.replaceAll("/", "-");
