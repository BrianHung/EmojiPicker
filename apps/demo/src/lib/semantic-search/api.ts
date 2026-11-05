import { remote } from "@brianhung/emoji-picker/search";

const API = (import.meta.env.VITE_SEARCH_API_URL ?? "").replace(/\/$/, "");

export type Backend = "embeddings" | "decision";
type ApiStatus = "unknown" | "ok" | "unavailable";

let status: Record<Backend, ApiStatus> = { embeddings: "unknown", decision: "unknown" };
const listeners = new Set<() => void>();
export const apiStatus = {
  get: () => status,
  subscribe: (listener: () => void) => (listeners.add(listener), () => void listeners.delete(listener)),
};
const setStatus = (backend: Backend, value: ApiStatus) => {
  if (status[backend] === value) return;
  status = { ...status, [backend]: value };
  listeners.forEach((l) => l());
};

// Without the API (local dev, a static host) this returns no hits, so a fallback to lexical() still fills the picker
function api(backend: Backend, path: string, body: Record<string, unknown> = {}) {
  return remote(async (query, { limit, signal, records }) => {
    try {
      const response = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, limit: Math.min(limit, 50), custom: records.some((r) => r.group === "custom"), ...body }),
        signal,
      });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw new Error(`${response.status}`);
      const { hits } = (await response.json()) as { hits: { unified: string; score: number }[] };
      setStatus(backend, "ok");
      return hits;
    } catch (error) {
      if (signal.aborted) throw error;
      setStatus(backend, "unavailable");
      return [];
    }
  });
}

export const embeddingsSearch = api("embeddings", "/api/embed-search");

export const decisionSearch = api("decision", "/api/decide");
