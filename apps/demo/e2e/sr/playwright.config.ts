import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
import { withGuidepup } from "@guidepup/playwright";
import base, { desktop, project } from "../../playwright.config";

const screen = { ...desktop, deviceScaleFactor: 1, colorScheme: "light" as const };

export default withGuidepup(
  defineConfig({
    ...base,
    testDir: ".",
    outputDir: fileURLToPath(new URL(".results", import.meta.url)),
    reporter: [["list"]],
    timeout: 180_000,
    retries: process.env.CI ? 2 : 0,
    projects: [project("voiceover", "voiceover.spec.ts", screen), project("nvda", "nvda.spec.ts", screen)],
  }),
);
