import fs from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import pkg from "../package.json" with { type: "json" };

const ORIGIN = "http://twemoji.test";
const SIZE = 64;
const dist = new URL("../dist/", import.meta.url);
const svgs = new URL(`../.cache/twemoji-${pkg.config.twemoji}/`, import.meta.url);

const SAMPLES: [name: string, file: string, text: string][] = [
  ["grinning face", "1f600", "😀"],
  ["red heart with VS16", "2764", "❤️"],
  ["thumbs up: medium skin tone", "1f44d-1f3fd", "👍🏽"],
  ["family ZWJ sequence", "1f468-200d-1f469-200d-1f467-200d-1f466", "👨‍👩‍👧‍👦"],
  ["rainbow flag ZWJ sequence", "1f3f3-fe0f-200d-1f308", "🏳️‍🌈"],
  ["country flag", "1f1fa-1f1f8", "🇺🇸"],
  ["subdivision flag", "1f3f4-e0067-e0062-e0073-e0063-e0074-e007f", "🏴󠁧󠁢󠁳󠁣󠁴󠁿"],
  ["keycap with VS16", "31-20e3", "1️⃣"],
  ["keycap without VS16", "23-20e3", "#⃣"],
];

async function open(page: Page, body: string) {
  const fonts: string[] = [];
  await page.route(`${ORIGIN}/**`, (route) => {
    const file = new URL(route.request().url()).pathname.slice(1);
    if (file === "") return route.fulfill({ contentType: "text/html; charset=utf-8", body: `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/twemoji.css"><body style="margin:0">${body}</body>` });
    if (file.endsWith(".woff2")) fonts.push(file);
    const source = file.endsWith(".svg") ? new URL(file, svgs) : new URL(file, dist);
    return route.fulfill({ body: fs.readFileSync(source), contentType: file.endsWith(".css") ? "text/css" : file.endsWith(".svg") ? "image/svg+xml" : "font/woff2" });
  });
  await page.goto(`${ORIGIN}/`);
  await page.evaluate(() => document.fonts.ready);
  return fonts;
}

const pixels = (page: Page, png: Buffer) =>
  page.evaluate(async (base64) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
    const ctx = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    return { width: bitmap.width, data: Array.from(ctx.getImageData(0, 0, bitmap.width, bitmap.height).data) };
  }, png.toString("base64"));

test("draws each sequence as one Twemoji glyph", async ({ page }) => {
  const cell = (child: string) => `<div style="display:inline-flex;align-items:center;justify-content:center;width:${SIZE}px;height:${SIZE}px;background:#fff">${child}</div>`;
  await open(
    page,
    SAMPLES.map(([, file, text]) => `<div style="display:flex;width:fit-content">${cell(`<span style="font:${SIZE}px/1 Twemoji">${text}</span>`)}${cell(`<img src="/${file}.svg" width="${SIZE}" height="${SIZE}">`)}</div>`).join(""),
  );
  for (const [i, [name]] of SAMPLES.entries()) {
    const row = page.locator("body > div").nth(i);
    const glyph = row.locator("span");
    await expect.soft(glyph, name).toHaveJSProperty("offsetWidth", SIZE);
    const shot = await row.screenshot({ path: test.info().outputPath(`${name}.png`) });
    const { width, data } = await pixels(page, shot);
    let colored = 0;
    let diff = 0;
    for (let p = 0; p < data.length; p += 4) {
      if ((p / 4) % width >= width / 2) continue;
      const q = p + (width / 2) * 4;
      const [r, g, b] = [data[p]!, data[p + 1]!, data[p + 2]!];
      if (Math.max(r, g, b) - Math.min(r, g, b) > 48) colored++;
      diff += Math.abs(r - data[q]!) + Math.abs(g - data[q + 1]!) + Math.abs(b - data[q + 2]!);
    }
    const area = data.length / 8;
    expect.soft(colored / area, `${name}: colored pixels`).toBeGreaterThan(0.05);
    expect.soft(diff / (area * 3 * 255), `${name}: difference from the SVG`).toBeLessThan(0.02);
  }
});

test("the first screen downloads only the smileys subset", async ({ page }) => {
  const fonts = await open(page, `<p style="font:32px Twemoji">😀😃😄😁😆😅🤣😂🙂🙃🫠😉😊😇🥰😍🤩😘</p>`);
  expect(fonts).toEqual(["twemoji-0.woff2"]);
});
