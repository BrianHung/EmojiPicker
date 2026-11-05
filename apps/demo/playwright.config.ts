import { defineConfig, type PlaywrightTestConfig } from "@playwright/test";

const BUILD = process.env.E2E_BUILD === "1";
const PORT = BUILD ? 5198 : 5199;
const desktop = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };
const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

type Project = NonNullable<PlaywrightTestConfig["projects"]>[number];
const project = (name: string, testMatch: string, use: Project["use"]): Project => ({ name, testMatch, use: { browserName: "chromium", ...use } });

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/warmup.ts",
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
    serviceWorkers: "block",
    timezoneId: "America/Los_Angeles",
    locale: "en-US",
    launchOptions: { args: ["--disable-smooth-scrolling"] },
  },
  projects: [
    project("desktop-light", "visual.spec.ts", { ...desktop, colorScheme: "light" }),
    project("desktop-dark", "visual.spec.ts", { ...desktop, colorScheme: "dark" }),
    project("mobile-light", "visual.spec.ts", { ...mobile, colorScheme: "light" }),
    project("keyboard", "keyboard.spec.ts", { ...desktop, colorScheme: "light" }),
    project("keyboard-mobile", "keyboard.spec.ts", { ...mobile, colorScheme: "light" }),
    project("editors", "editors.spec.ts", { ...desktop, colorScheme: "light" }),
    project("layout", "layout.spec.ts", { ...desktop, colorScheme: "light" }),
    project("ime", "ime.spec.ts", { ...desktop, colorScheme: "light" }),
    project("perf", "perf.spec.ts", { ...desktop, colorScheme: "light" }),
  ],
  webServer: {
    command: BUILD ? `npx vite build && npx vite preview --port ${PORT} --strictPort` : `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !BUILD,
    timeout: 120_000,
  },
});
