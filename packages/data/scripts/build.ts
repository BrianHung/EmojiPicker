import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDataset, emojibaseLocales, findEmojibase } from "@brianhung/emoji-picker-core/build";

const emojibase = findEmojibase();
if (!emojibase) throw new Error("emojibase-data is not installed");
const out = fileURLToPath(new URL("../data/", import.meta.url));
const TYPES = 'declare const data: import("../../dataset.cjs").Dataset;\nexport = data;\n';

const setsIn = (locale: string) => {
  const dir = path.join(emojibase.root, locale, "shortcodes");
  return fs.existsSync(dir) ? fs.readdirSync(dir).flatMap((f) => (f.endsWith(".json") ? [f.slice(0, -5)] : [])) : [];
};

fs.rmSync(out, { recursive: true, force: true });
let count = 0;
for (const locale of emojibaseLocales(emojibase.root)) {
  for (const set of [...new Set([...setsIn(locale), ...setsIn("en")])].sort()) {
    const { dataset } = buildDataset({ locale, shortcodes: [set], load: emojibase.load });
    fs.mkdirSync(path.join(out, locale), { recursive: true });
    fs.writeFileSync(path.join(out, locale, `${set}.json`), JSON.stringify(dataset));
    fs.writeFileSync(path.join(out, locale, `${set}.json.d.cts`), TYPES);
    count++;
  }
}
console.log(`${count} datasets in ${path.relative(process.cwd(), out)}`);
