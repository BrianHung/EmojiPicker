// Copies the emoji corpus into data/ so the Worker is self-contained (the Deploy
// to Cloudflare button builds this directory on its own, outside the monorepo).
//
//   npm run sync-emoji                              built-ins from @brianhung/emoji-picker
//   npm run sync-emoji -- --custom ./my-emoji.json  also replace data/custom-emoji.json
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { custom: { type: "string" }, data: { type: "string", default: "../../packages/emoji-picker/data/en.json" } } });

type DatasetEmoji = [string, string, string[], string[], number, number, 0 | 1];
const dataset: { emojibase: string; emojis: DatasetEmoji[] } = JSON.parse(readFileSync(values.data!, "utf8"));
// [unified, name, shortcodes, tags]: everything the Worker embeds or shows Jev.
const emoji = dataset.emojis.map(([unified, name, tags, shortcodes]) => [unified, name, shortcodes, tags]);
writeFileSync(new URL("../data/emoji.json", import.meta.url), JSON.stringify({ emojibase: dataset.emojibase, emoji }) + "\n");
console.log(`data/emoji.json: ${emoji.length} emoji (emojibase ${dataset.emojibase})`);

const customPath = values.custom ?? "../demo/examples/semantic-search/custom-emoji.json";
try {
  const custom = JSON.parse(readFileSync(customPath, "utf8"));
  if (!Array.isArray(custom) || custom.some((c) => typeof c?.id !== "string" || typeof c?.name !== "string")) throw new Error("expected [{ id, name, imageUrl, shortcodes?, tags?, description? }]");
  writeFileSync(new URL("../data/custom-emoji.json", import.meta.url), JSON.stringify(custom, null, 2) + "\n");
  console.log(`data/custom-emoji.json: ${custom.length} custom emoji from ${customPath}`);
} catch (error) {
  if (values.custom) throw error;
}
