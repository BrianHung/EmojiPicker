import type { EmojiSearch } from "@brianhung/emoji-picker";
import type { WorkerRequest, WorkerResponse } from "./on-device.worker";

const MODEL = "Xenova/bge-small-en-v1.5";

type Status = { state: "idle" | "loading" | "ready" | "error"; loaded: number; total: number; loadMs?: number; error?: string };
let status: Status = { state: "idle", loaded: 0, total: 0 };
const listeners = new Set<() => void>();
const setStatus = (next: Partial<Status>) => {
  status = { ...status, ...next };
  listeners.forEach((l) => l());
};
export const onDeviceStatus = {
  get: () => status,
  subscribe: (listener: () => void) => (listeners.add(listener), () => void listeners.delete(listener)),
};

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, (result: Extract<WorkerResponse, { type: "result" | "error" }>) => void>();

export function loadOnDevice() {
  if (worker) return;
  worker = new Worker(new URL("./on-device.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
    if (data.type === "progress") setStatus({ state: "loading", loaded: data.loaded, total: data.total });
    else if (data.type === "ready") setStatus({ state: "ready", loadMs: data.loadMs });
    else if (data.type === "error" && data.id === undefined) setStatus({ state: "error", error: data.message });
    else if (data.id !== undefined) {
      pending.get(data.id)?.(data);
      pending.delete(data.id);
    }
  };
  setStatus({ state: "loading" });
  const base = import.meta.env.BASE_URL;
  worker.postMessage({ type: "load", model: MODEL, index: `${base}embeddings/emoji.i8`, custom: `${base}embeddings/custom.i8` } satisfies WorkerRequest);
}

// Empty until the model loads, so fallback(onDeviceSearch, lexical()) answers meanwhile
export const onDeviceSearch: EmojiSearch = (query, { limit, records, signal }) => {
  if (!worker || status.state !== "ready") return [];
  const custom = records.some((r) => r.group === "custom");
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, (result) => (result.type === "error" ? reject(new Error(result.message)) : resolve(result.hits)));
    signal.addEventListener("abort", () => pending.delete(id));
    worker!.postMessage({ type: "search", id, query, limit, custom } satisfies WorkerRequest);
  });
};
