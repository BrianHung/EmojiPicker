// Regression suite for the demo site: pixel snapshots (e2e/visual.spec.ts) and keyboard/ARIA
// behaviour recorded as reviewable JSON (e2e/behavior.spec.ts). `npm run test:e2e` runs both.
import { defineConfig, type PlaywrightTestConfig } from "@playwright/test";

// The shared dev server on :5199 (reused when running), or with E2E_BUILD=1 a production build served
// by `vite preview` on :5198: nothing reloads mid-test while files change. Baselines are captured that way.
const BUILD = process.env.E2E_BUILD === "1";
const PORT = BUILD ? 5198 : 5199;
const desktop = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };
const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

type Project = NonNullable<PlaywrightTestConfig["projects"]>[number];
const project = (name: string, testMatch: string, use: Project["use"]): Project => ({ name, testMatch, use: { browserName: "chromium", ...use } });

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/warmup.ts",
  // Snapshots sit next to the spec, one folder per project ("visual.spec.ts-snapshots/desktop-dark/…").
  snapshotPathTemplate: "{testDir}/__snapshots__/{testFileName}/{projectName}/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : 6,
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e/.report" }]],
  outputDir: "e2e/.results",
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.001, animations: "disabled", caret: "hide", scale: "device" },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    actionTimeout: 10_000,
    // Remote art is pinned per test in e2e/support.ts; nothing else should leave the machine.
    serviceWorkers: "block",
    timezoneId: "America/Los_Angeles",
    locale: "en-US",
    // Instant scrolling: key presses that scroll the page do so by a fixed amount, before the probe reads it.
    launchOptions: { args: ["--disable-smooth-scrolling"] },
  },
  projects: [
    project("desktop-light", "visual.spec.ts", { ...desktop, colorScheme: "light" }),
    project("desktop-dark", "visual.spec.ts", { ...desktop, colorScheme: "dark" }),
    project("mobile-light", "visual.spec.ts", { ...mobile, colorScheme: "light" }),
    project("mobile-dark", "visual.spec.ts", { ...mobile, colorScheme: "dark" }),
    // Behaviour doesn't depend on the theme: one run per viewport.
    project("desktop", "behavior.spec.ts", { ...desktop, colorScheme: "light" }),
    project("mobile", "behavior.spec.ts", { ...mobile, colorScheme: "light" }),
    project("editors", "editors.spec.ts", { ...desktop, colorScheme: "light" }),
    project("grid", "grid.spec.ts", { ...desktop, colorScheme: "light" }),
  ],
  webServer: {
    command: BUILD ? `npx vite build && npx vite preview --port ${PORT} --strictPort` : `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !BUILD,
    timeout: 120_000,
  },
});
