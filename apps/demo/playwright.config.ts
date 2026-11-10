import { fileURLToPath } from "node:url";
import { defineConfig, type PlaywrightTestConfig } from "@playwright/test";

const BUILD = process.env.E2E_BUILD === "1";
// CI has no visual baselines: they are local and gitignored
const VISUAL = process.env.E2E_VISUAL !== "0";
const PORT = Number(process.env.E2E_PORT) || (BUILD ? 5198 : 5199);
const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export const desktop = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };
export const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

type Project = NonNullable<PlaywrightTestConfig["projects"]>[number];
export const project = (name: string, testMatch: string | undefined, use: Project["use"]): Project => ({ name, ...(testMatch ? { testMatch } : {}), use: { browserName: "chromium", ...use } });

export default defineConfig({
  testDir: here("e2e"),
  globalSetup: here("e2e/warmup.ts"),
  snapshotPathTemplate: "{testDir}/__snapshots__/{testFileName}/{projectName}/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : 6,
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never", outputFolder: here("e2e/.report") }]],
  outputDir: here("e2e/.results"),
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.001, animations: "disabled", caret: "hide", scale: "device" },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    actionTimeout: 10_000,
    serviceWorkers: "block",
    timezoneId: "America/Los_Angeles",
    locale: "en-US",
    launchOptions: { args: ["--disable-smooth-scrolling"] },
  },
  projects: [
    ...(VISUAL
      ? [
          project("desktop-light", "visual.spec.ts", { ...desktop, colorScheme: "light" }),
          project("desktop-dark", "visual.spec.ts", { ...desktop, colorScheme: "dark" }),
          project("mobile-light", "visual.spec.ts", { ...mobile, colorScheme: "light" }),
        ]
      : []),
    project("keyboard", "keyboard.spec.ts", { ...desktop, colorScheme: "light" }),
    project("keyboard-mobile", "keyboard.spec.ts", { ...mobile, colorScheme: "light" }),
    project("editors", "editors.spec.ts", { ...desktop, colorScheme: "light" }),
    project("contracts", "contracts.spec.ts", { ...desktop, colorScheme: "light" }),
    project("layout", "layout.spec.ts", { ...desktop, colorScheme: "light" }),
    { ...project("layout-webkit-mobile", "layout.spec.ts", { ...mobile, deviceScaleFactor: 3, colorScheme: "dark", browserName: "webkit", launchOptions: {} }), grep: /pinned section title/ },
    project("ime", "ime.spec.ts", { ...desktop, colorScheme: "light" }),
    project("perf", "perf.spec.ts", { ...desktop, colorScheme: "light" }),
  ],
  webServer: {
    command: BUILD ? `npx vite build && npx vite preview --port ${PORT} --strictPort` : `npx vite --port ${PORT} --strictPort`,
    cwd: here("."),
    url: `http://localhost:${PORT}`,
    // With E2E_PORT set, a server already on that port belongs to another checkout
    reuseExistingServer: !BUILD && !process.env.CI && !process.env.E2E_PORT,
    timeout: 120_000,
  },
});
