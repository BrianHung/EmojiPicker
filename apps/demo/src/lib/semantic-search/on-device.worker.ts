// Runs bge-small-en-v1.5 with transformers.js off the main thread, and ranks the
// precomputed emoji vectors against each query.
import { pipeline, type FeatureExtractionPipeline, type ProgressInfo } from "@huggingface/transformers";
import { QUERY_PREFIX } from "./emoji-text";
import { decodeIndex, rank, type VectorIndex } from "./vectors";

export type WorkerRequest =
  | { type: "load"; model: string; index: string; custom?: string }
  | { type: "search"; id: number; query: string; limit: number; custom: boolean };

export type WorkerResponse =
  | { type: "progress"; loaded: number; total: number }
  | { type: "ready"; loadMs: number; device: string }
  | { type: "error"; id?: number; message: string }
  | { type: "result"; id: number; hits: { unified: string; score: number }[]; embedMs: number; rankMs: number };

const post = (message: WorkerResponse) => self.postMessage(message);
let extract: FeatureExtractionPipeline;
let builtIn: VectorIndex;
let custom: VectorIndex | null = null;

async function fetchIndex(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return decodeIndex(await response.arrayBuffer());
}

async function load({ model, index, custom: customUrl }: Extract<WorkerRequest, { type: "load" }>) {
  const start = performance.now();
  const files = new Map<string, { loaded: number; total: number }>();
  const progress = (info: ProgressInfo) => {
    if (info.status !== "progress") return;
    files.set(info.file, { loaded: info.loaded, total: info.total });
    let loaded = 0;
    let total = 0;
    for (const f of files.values()) (loaded += f.loaded), (total += f.total);
    post({ type: "progress", loaded, total });
  };
  // q8: the 34 MB quantized ONNX file. The browser caches it (Cache API) after the first run.
  [extract, builtIn, custom] = await Promise.all([
    pipeline("feature-extraction", model, { dtype: "q8", device: "wasm", progress_callback: progress }),
    fetchIndex(index),
    customUrl ? fetchIndex(customUrl) : Promise.resolve(null),
  ]);
  await extract(QUERY_PREFIX + "warm up", { pooling: "cls", normalize: true });
  post({ type: "ready", loadMs: Math.round(performance.now() - start), device: "wasm" });
}

async function search({ id, query, limit, custom: withCustom }: Extract<WorkerRequest, { type: "search" }>) {
  const t0 = performance.now();
  const output = await extract(QUERY_PREFIX + query, { pooling: "cls", normalize: true });
  const vector = output.data as Float32Array;
  const t1 = performance.now();
  // Exact int8 scan: 1,923 × 384 multiply-adds is under a millisecond. For larger
  // sets, pass { shortlist: 128 } to rerank only the nearest by Hamming distance.
  let hits = rank(builtIn, vector, { limit });
  if (withCustom && custom) hits = [...hits, ...rank(custom, vector, { limit })].sort((a, b) => b.score - a.score).slice(0, limit);
  const t2 = performance.now();
  post({ type: "result", id, hits, embedMs: t1 - t0, rankMs: t2 - t1 });
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  const run = message.type === "load" ? load(message) : search(message);
  run.catch((error: unknown) => post({ type: "error", id: message.type === "search" ? message.id : undefined, message: error instanceof Error ? error.message : String(error) }));
};
