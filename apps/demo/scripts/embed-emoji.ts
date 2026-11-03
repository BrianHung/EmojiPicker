// Precomputes the on-device index: embeds every emoji with bge-small-en-v1.5 (the
// model the page runs in the browser) and writes int8 vectors to public/embeddings/.
//
//   npm run embed -w demo
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { pipeline } from "@huggingface/transformers";
import type { Dataset } from "@brianhung/emoji-picker";
import { emojiText } from "../examples/semantic-search/emoji-text";
import { encodeIndex } from "../examples/semantic-search/vectors";

export const MODEL = "Xenova/bge-small-en-v1.5";
const OUT = fileURLToPath(new URL("../public/embeddings/bge-small-en-v1.5.int8.bin", import.meta.url));
const BATCH = 64;

const require = createRequire(import.meta.url);
const dataset: Dataset = JSON.parse(readFileSync(require.resolve("@brianhung/emoji-picker/data/en.json"), "utf8"));
const emojis = dataset.emojis.map(([unified, name, tags, shortcodes]) => ({ unified, name, tags, shortcodes }));

// q8 matches the browser; CLS pooling + normalize is how BGE is meant to be pooled.
const extract = await pipeline("feature-extraction", MODEL, { dtype: "q8" });
const vectors: Float32Array[] = [];
let dims = 0;
const start = performance.now();
for (let i = 0; i < emojis.length; i += BATCH) {
  const batch = emojis.slice(i, i + BATCH);
  const out = await extract(batch.map(emojiText), { pooling: "cls", normalize: true });
  dims = out.dims[1]!;
  const data = out.data as Float32Array;
  for (let j = 0; j < batch.length; j++) vectors.push(data.slice(j * dims, (j + 1) * dims));
  process.stdout.write(`\r${vectors.length}/${emojis.length}`);
}
const bytes = encodeIndex(emojis.map((e) => e.unified), vectors, dims);
mkdirSync(new URL("../public/embeddings/", import.meta.url), { recursive: true });
writeFileSync(OUT, bytes);
console.log(`\n${emojis.length} × ${dims} in ${((performance.now() - start) / 1000).toFixed(1)} s → ${OUT} (${(bytes.length / 1024).toFixed(0)} KB)`);
