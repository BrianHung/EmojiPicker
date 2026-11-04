// Screen reader suite (Guidepup): the same scenarios under VoiceOver (macOS) and NVDA (Windows).
// `npm run test:sr:voiceover` / `npm run test:sr:nvda`; each skips, naming the setup command, when its
// screen reader isn't installed and configured (./ready.ts). Both run Chromium: WebKit's Tab skips
// buttons unless macOS keyboard navigation is on, and the scenarios Tab between controls.
// JAWS needs a licence and has no Guidepup driver: it's a manual pass (see apps/demo/README.md).
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
import { withGuidepup } from "@guidepup/playwright";
import base from "../../playwright.config";

const desktop = { viewport: { width: 1440, height: 900 }, colorScheme: "light" as const };

export default withGuidepup(
  defineConfig({
    ...base,
    testDir: ".",
    // Paths in the base config are relative to apps/demo, not to this folder.
    globalSetup: base.globalSetup && fileURLToPath(new URL("../warmup.ts", import.meta.url)),
    webServer: { ...(base.webServer as object), cwd: fileURLToPath(new URL("../..", import.meta.url)) } as typeof base.webServer,
    outputDir: ".results",
    reporter: [["list"]],
    // Screen readers are slow and a little flaky to drive; one retry on CI.
    timeout: 180_000,
    retries: process.env.CI ? 1 : 0,
    projects: [
      { name: "voiceover", testMatch: "voiceover.spec.ts", use: { browserName: "chromium", ...desktop } },
      { name: "nvda", testMatch: "nvda.spec.ts", use: { browserName: "chromium", ...desktop } },
    ],
  }),
);
