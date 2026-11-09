import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "test",
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  outputDir: "test/.results",
  use: { deviceScaleFactor: 2 },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], deviceScaleFactor: 2 } },
    { name: "webkit", use: { ...devices["Desktop Safari"], deviceScaleFactor: 2 } },
    { name: "firefox", use: { ...devices["Desktop Firefox"], deviceScaleFactor: 2 } },
  ],
});
