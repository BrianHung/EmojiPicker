// axe regression suite: `npm run test:a11y`. Reuses the e2e config (dev server, base URL, pinned
// remote art) with its own projects: desktop light and dark, and phone width (where popovers are sheets).
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
import base from "../../playwright.config";

const desktop = { viewport: { width: 1440, height: 900 } };
const mobile = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

export default defineConfig({
  ...base,
  testDir: ".",
  // Paths in the base config are relative to apps/demo, not to this folder.
  globalSetup: base.globalSetup && fileURLToPath(new URL("../warmup.ts", import.meta.url)),
  webServer: { ...(base.webServer as object), cwd: fileURLToPath(new URL("../..", import.meta.url)) } as typeof base.webServer,
  outputDir: ".results",
  reporter: [["list"]],
  projects: [
    { name: "desktop-light", use: { browserName: "chromium", ...desktop, colorScheme: "light" } },
    { name: "desktop-dark", use: { browserName: "chromium", ...desktop, colorScheme: "dark" } },
    { name: "mobile-light", use: { browserName: "chromium", ...mobile, colorScheme: "light" } },
  ],
});
