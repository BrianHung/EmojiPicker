// all-the-bufo has no license: images are only fetched into memory, and pack.json stores their URLs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const INDEX = "https://raw.githubusercontent.com/knobiknows/all-the-bufo/main/index.md";
const IMAGE = "https://all-the.bufo.zone/";
const MIN_SIZE = 96;
const SHEET = fileURLToPath(new URL("../capture/out/bufo-picks.png", import.meta.url));
const PACK = fileURLToPath(new URL("../public/packs/bufo/pack.json", import.meta.url));

const PICKS = [
  "bufo-yes",
  "bufo-no",
  "bufo-party",
  "bufo-lgtm",
  "bufo-wave",
  "bufo-heart",
  "bufo-thumbsup",
  "bufo-celebrate",
  "bufo-laugh-xd",
  "bufo-hug",
  "bufo-pray",
  "bufo-eyes",
  "bufo-facepalm",
  "bufo-shrug",
  "bufo-happy",
  "bufo-sweat",
  "bufo-hello",
  "bufo-thanks",
  "bufo-ack",
  "bufo-check",
  "bufo-congrats",
  "bufo-upvote",
  "bufo-downvote",
  "bufo-excited",
  "bufo-shy",
  "bufo-worried",
  "bufo-phew",
  "bufo-sigh",
  "bufo-wat",
  "bufo-idk",
  "bufo-please",
  "bufo-welcome",
  "bufo-mindblown",
  "bufo-nervous",
  "bufo-confused",
  "bufo-uwu",
  "bufo-blep",
  "bufo-peek",
  "bufo-chefkiss",
  "bufo-innocent",
  "bufo-pog",
  "bufo-lfg",
  "bufo-grin",
  "bufo-concerned",
  "bufo-snore",
  "bufo-shaking-head",
  "bufo-tips-hat",
  "bufo-detective",
  "bufo-pirate",
  "bufo-cowboy",
  "bufo-king",
  "bufo-nerd",
  "bufo-science",
  "bufo-rocket",
  "bufo-medal",
  "bufo-confetti",
  "bufo-yay",
  "bufo-starstruck",
  "bufo-cuppa",
  "bufo-boba",
  "bufo-ice-cream",
  "bufo-popcorn",
  "bufo-ramen",
  "bufo-taco",
  "bufo-shipping",
  "bufo-offers-a-deploy-lock",
  "bufo-code-freeze",
  "bufo-blesses-this-pr",
  "bufo-approve",
  "bufo-revokes-his-approval",
  "bufo-thinks-about-rubberduck",
  "bufo-offers-a-loading-spinner",
  "bufo-hackerman",
  "bufo-raised-hand",
  "bufo-this-is-fine",
  "bufo-panic",
  "bufo-deep-hmm",
  "bufo-think",
  "bufo-wink",
  "bufo-extra-cool",
  "bufo-ok",
  "bufo-tada",
  "bufo-clap-hd",
  "bufo-salute",
  "bufo-angry",
  "bufo-shifty",
  "bufo-what-have-i-done",
  "bufo-sad-rain",
  "bufo-headphones",
  "bufos-in-love",
  "bufo-gives-star",
  "bufo-pray-partying",
  "bufo-party-birthday",
  "bufo-offers-a-cake",
  "bufo-disco",
  "bufo-hype",
  "bufo-unicorn",
  "bufo-magician",
  "bufo-ninja",
  "bufo-gamer",
  "bufo-photographer",
  "bufo-spooky-szn",
  "bufo-ghost-costume",
  "bufo-santa",
  "bufo-morning-sun",
  "bufo-reading",
  "bufo-cash-money",
  "bufo-make-it-rain",
  "bufo-offers-chart-with-upwards-trend",
  "bufo-has-a-hot-take",
  "bufo-hotdog-rocket",
  "bufo-wizard",
  "bufo-offers-coffee",
  "bufo-beer",
  "bufo-chef",
  "bufo-sushi",
  "bufo-cookie",
  "bufo-dog",
  "bufo-offers-avocado",
  "bufo-watermelon",
  "bufo-strawberry",
  "bufo-pineapple",
  "bufo-lemon",
  "bufo-potato",
  "bufo-corn",
  "bufo-basketball",
  "bufo-soccer",
  "bufo-firefighter",
];

type Candidate = { file: string; width: number; height: number; animated: boolean; buf: Buffer };

async function isPixelArt(buf: Buffer): Promise<boolean> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  for (const k of [2, 3, 4]) {
    let same = 0;
    let blocks = 0;
    for (let y = 0; y + k <= h; y += k)
      for (let x = 0; x + k <= w; x += k) {
        const o = (y * w + x) * 4;
        let uniform = true;
        for (let dy = 0; dy < k && uniform; dy++)
          for (let dx = 0; dx < k && uniform; dx++) {
            const p = ((y + dy) * w + x + dx) * 4;
            for (let c = 0; c < 4; c++) if (Math.abs(data[p + c]! - data[o + c]!) > 8) uniform = false;
          }
        blocks++;
        if (uniform) same++;
      }
    if (same / blocks > 0.97) return true;
  }
  return false;
}

async function main() {
  const index = await (await fetch(INDEX)).text();
  const files = [...index.matchAll(/^\|\s*([^|\s]+\.(?:png|gif|jpg))\s*\|/gm)].map((m) => m[1]!);
  const byStem = new Map(files.map((f) => [f.replace(/\.\w+$/, ""), f]));
  console.error(`${files.length} files in the index`);

  const picks: Candidate[] = [];
  for (const stem of PICKS) {
    const file = byStem.get(stem);
    if (!file) throw new Error(`${stem} is not in the index`);
    const res = await fetch(IMAGE + file);
    if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(buf).metadata();
    const width = meta.width ?? 0;
    const height = meta.pageHeight ?? meta.height ?? 0;
    if (width < MIN_SIZE || height < MIN_SIZE) throw new Error(`${file}: ${width}x${height}`);
    if (await isPixelArt(buf)) throw new Error(`${file}: pixel art`);
    picks.push({ file, width, height, animated: (meta.pages ?? 1) > 1, buf });
  }

  const T = 96;
  const L = 28;
  const cols = 8;
  const rows = Math.ceil(picks.length / cols);
  const tiles = await Promise.all(
    picks.map(async (p, i) => {
      const img = await sharp(p.buf)
        .resize(T - 16, T - 16, { fit: "contain", background: "#0000" })
        .png()
        .toBuffer();
      const label = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${T + 16}" height="${L}"><text x="${(T + 16) / 2}" y="12" font-family="Helvetica" font-size="10" text-anchor="middle" fill="#333">${p.file.replace(/^bufo-/, "").replace(/\.\w+$/, "")}${p.animated ? " (gif)" : ""}</text><text x="${(T + 16) / 2}" y="24" font-family="Helvetica" font-size="9" text-anchor="middle" fill="#999">${p.width}x${p.height}</text></svg>`,
      );
      const x = (i % cols) * (T + 16);
      const y = Math.floor(i / cols) * (T + L);
      return [
        { input: img, left: x + 16, top: y + 8 },
        { input: label, left: x, top: y + T - 6 },
      ];
    }),
  );
  mkdirSync(join(SHEET, ".."), { recursive: true });
  await sharp({ create: { width: cols * (T + 16), height: rows * (T + L), channels: 4, background: "#ffffff" } })
    .composite(tiles.flat())
    .png()
    .toFile(SHEET);

  console.error(`${picks.length} picks (${picks.filter((p) => p.animated).length} animated); sheet → ${SHEET}`);
  const pack = picks.map(({ file, width, height, animated }) => {
    const id = file.replace(/\.\w+$/, "");
    return { id, name: id.replace(/[-_]+/g, " "), imageUrl: `https://all-the.bufo.zone/${file}`, shortcodes: [id], group: "Bufo", width, height, ...(animated ? { animated: true } : {}) };
  });
  writeFileSync(PACK, `${JSON.stringify(pack, null, 2)}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
