// Global setup: load every page once so the dev server has transformed and pre-bundled everything before
// the tests start (a dependency discovered mid-run makes Vite reload the page). Cheap against a build.
import { chromium, type FullConfig } from "@playwright/test";
import { SHOTS, SURFACES } from "./surfaces";

export default async function warmup(config: FullConfig) {
  const baseURL = config.projects[0]!.use.baseURL!;
  const paths = [...new Set([...SURFACES, ...SHOTS].map((s) => s.path.split("#")[0]!))];
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const path of paths) {
    // Twice: a first load can end in Vite's "optimized dependencies changed" reload.
    for (let i = 0; i < 2; i++) {
      await page.goto(baseURL + path);
      await page.waitForLoadState("networkidle");
    }
  }
  await browser.close();
}
