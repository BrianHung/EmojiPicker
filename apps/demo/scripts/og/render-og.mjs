import { chromium } from "@playwright/test";
import sharp from "sharp";
import { createServer } from "vite";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const pub = (file) => fileURLToPath(new URL(`../../public/${file}`, import.meta.url));
const DURATION = 6;
const FPS = 30;

const server = await createServer({ root: fileURLToPath(new URL("../..", import.meta.url)), server: { port: 5390, strictPort: false } });
await server.listen();
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
const frame = () => page.locator("[data-og]").screenshot();
const loaded = () => page.waitForFunction(() => "setOgTime" in window && [...document.images].every((img) => img.complete && img.naturalWidth));

await page.goto(new URL("scripts/og/", server.resolvedUrls.local[0]).href, { waitUntil: "domcontentloaded" });
await loaded();
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
await sharp(await frame())
  .resize(1200, 630)
  .png({ compressionLevel: 9 })
  .toFile(pub("og.png"));

const frames = mkdtempSync(join(tmpdir(), "og-video-"));
for (let i = 0; i < DURATION * FPS; i++) {
  await page.evaluate((t) => window.setOgTime(t), i / FPS);
  await loaded();
  await sharp(await frame())
    .resize(1200, 630)
    .toFile(join(frames, `${String(i).padStart(4, "0")}.png`));
}
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(frames, "%04d.png"), "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", pub("og.mp4")]);
rmSync(frames, { recursive: true });
await browser.close();
await server.close();

const twemoji = Buffer.from(await (await fetch("https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/svg/1faea.svg")).arrayBuffer());
const svg = sharp(twemoji, { density: 512 });
await svg.clone().resize(140, 140).extend({ top: 20, bottom: 20, left: 20, right: 20, background: "#ffffff" }).flatten({ background: "#ffffff" }).png().toFile(pub("apple-touch-icon.png"));
await svg.clone().resize(32, 32).png().toFile(pub("favicon-32.png"));
console.log("wrote og.png, og.mp4, apple-touch-icon.png, favicon-32.png");
