import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
import base, { desktop, project } from "../../playwright.config";

const screen = { ...desktop, deviceScaleFactor: 1 };

export default defineConfig({
  ...base,
  testDir: ".",
  outputDir: fileURLToPath(new URL(".results", import.meta.url)),
  reporter: [["list"]],
  projects: [project("desktop-light", undefined, { ...screen, colorScheme: "light" }), project("desktop-dark", undefined, { ...screen, colorScheme: "dark" })],
});
