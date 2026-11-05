// Renders the Open Graph image, the og:video and the PNG favicons into public/. Needs the dev server on :5199.
import { chromium } from "playwright";
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const pub = (file) => fileURLToPath(new URL(`../public/${file}`, import.meta.url));
const SHOT = "http://localhost:5199/shot.html";
const DURATION = 6;
const FPS = 30;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });

await page.goto(`${SHOT}?view=og`, { waitUntil: "domcontentloaded" });
await page.locator("[data-og] img").first().waitFor();
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
await sharp(await page.locator("[data-og]").screenshot())
  .resize(1200, 630)
  .png({ compressionLevel: 9 })
  .toFile(pub("og.png"));

/** Steps the og:video frame by frame and encodes it as H.264. */
async function renderVideo(out) {
  await page.goto(`${SHOT}?view=og-video`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => "setOgTime" in window && [...document.images].every((img) => img.complete && img.naturalWidth));
  await page.evaluate(() => document.fonts.ready);
  const frames = mkdtempSync(join(tmpdir(), "og-video-"));
  for (let i = 0; i < DURATION * FPS; i++) {
    // An edit elsewhere can reload the dev page mid-render: wait for the harness to come back.
    await page.waitForFunction(() => typeof window.setOgTime === "function" && [...document.images].every((img) => img.complete && img.naturalWidth));
    await page.evaluate((t) => window.setOgTime(t), i / FPS);
    await sharp(await page.locator("[data-og]").screenshot())
      .resize(1200, 630)
      .toFile(join(frames, `${String(i).padStart(4, "0")}.png`));
  }
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(frames, "%04d.png"), "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", pub(out)]);
  rmSync(frames, { recursive: true });
}

await renderVideo("og.mp4");
await browser.close();

// favicon.svg is the 🫪 character (each system draws its own); the PNG fallbacks use Twemoji's.
const twemoji = Buffer.from(await (await fetch("https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/svg/1faea.svg")).arrayBuffer());
const svg = sharp(twemoji, { density: 512 });
await svg.clone().resize(140, 140).extend({ top: 20, bottom: 20, left: 20, right: 20, background: "#ffffff" }).flatten({ background: "#ffffff" }).png().toFile(pub("apple-touch-icon.png"));
await svg.clone().resize(32, 32).png().toFile(pub("favicon-32.png"));
console.log("wrote og.png, og.mp4, apple-touch-icon.png, favicon-32.png");
