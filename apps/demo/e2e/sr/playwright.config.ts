import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
import { withGuidepup } from "@guidepup/playwright";
import base from "../../playwright.config";

const desktop = { viewport: { width: 1440, height: 900 }, colorScheme: "light" as const };

export default withGuidepup(
  defineConfig({
    ...base,
    testDir: ".",
    globalSetup: base.globalSetup && fileURLToPath(new URL("../warmup.ts", import.meta.url)),
    webServer: { ...(base.webServer as object), cwd: fileURLToPath(new URL("../..", import.meta.url)) } as typeof base.webServer,
    outputDir: ".results",
    reporter: [["list"]],
    timeout: 180_000,
    retries: process.env.CI ? 2 : 0,
    projects: [
      { name: "voiceover", testMatch: "voiceover.spec.ts", use: { browserName: "chromium", ...desktop } },
      { name: "nvda", testMatch: "nvda.spec.ts", use: { browserName: "chromium", ...desktop } },
    ],
  }),
);
