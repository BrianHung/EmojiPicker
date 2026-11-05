import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { pipeline } from "@huggingface/transformers";
import type { CustomEmoji, Dataset } from "@brianhung/emoji-picker";
import { emojiText } from "../src/lib/semantic-search/emoji-text";
import { encodeIndex } from "../src/lib/semantic-search/vectors";

const MODEL = "Xenova/bge-small-en-v1.5";
const BATCH = 64;
const here = dirname(fileURLToPath(import.meta.url));

const { values } = parseArgs({ options: { custom: { type: "string" }, out: { type: "string" } } });

type Item = { id: string; name: string; shortcodes?: readonly string[]; tags?: readonly string[]; description?: string };
let items: Item[];
if (values.custom) {
  const list = JSON.parse(readFileSync(values.custom, "utf8")) as (CustomEmoji & { description?: string })[];
  if (!Array.isArray(list) || list.some((c) => typeof c?.id !== "string" || typeof c?.name !== "string")) throw new Error(`${values.custom}: expected [{ id, name, imageUrl, shortcodes?, tags?, description? }]`);
  items = list;
} else {
  const require = createRequire(import.meta.url);
  const dataset: Dataset = JSON.parse(readFileSync(require.resolve("@brianhung/emoji-picker-core/data/en.json"), "utf8"));
  items = dataset.emojis.map(([id, name, tags, shortcodes]) => ({ id, name, tags, shortcodes }));
}
const out = resolve(values.out ?? resolve(here, "../public/embeddings", values.custom ? "custom.i8" : "emoji.i8"));

const extract = await pipeline("feature-extraction", MODEL, { dtype: "q8" });
const vectors: Float32Array[] = [];
let dims = 0;
const start = performance.now();
for (let i = 0; i < items.length; i += BATCH) {
  const batch = items.slice(i, i + BATCH);
  const output = await extract(batch.map(emojiText), { pooling: "cls", normalize: true });
  dims = output.dims[1]!;
  const data = output.data as Float32Array;
  for (let j = 0; j < batch.length; j++) vectors.push(data.slice(j * dims, (j + 1) * dims));
  process.stdout.write(`\r${vectors.length}/${items.length}`);
}
const bytes = encodeIndex(
  items.map((e) => e.id),
  vectors,
  dims,
);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, bytes);
console.log(`\n${items.length} × ${dims} in ${((performance.now() - start) / 1000).toFixed(1)} s → ${out} (${(bytes.length / 1024).toFixed(0)} KB)`);
