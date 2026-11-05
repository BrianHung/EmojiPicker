import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
import base from "../../playwright.config";

const desktop = { viewport: { width: 1440, height: 900 } };

export default defineConfig({
  ...base,
  testDir: ".",
  globalSetup: base.globalSetup && fileURLToPath(new URL("../warmup.ts", import.meta.url)),
  webServer: { ...(base.webServer as object), cwd: fileURLToPath(new URL("../..", import.meta.url)) } as typeof base.webServer,
  outputDir: ".results",
  reporter: [["list"]],
  projects: [
    { name: "desktop-light", use: { browserName: "chromium", ...desktop, colorScheme: "light" } },
    { name: "desktop-dark", use: { browserName: "chromium", ...desktop, colorScheme: "dark" } },
  ],
});
