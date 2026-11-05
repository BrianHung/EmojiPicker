// The server-side searches, served by this site's Worker (worker/index.ts) on the same
// origin. VITE_SEARCH_API_URL points them at an API hosted elsewhere.
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

/**
 * POST <path> { query, limit, custom, ...body } → { hits }. When the API can't answer
 * (local dev without Cloudflare bindings, a static host), it returns no hits, so a
 * `fallback` to lexical() still fills the picker.
 */
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

/** Workers AI embeddings (bge-large-en-v1.5), nearest neighbors from Vectorize. */
export const embeddingsSearch = api("embeddings", "/api/embed-search");

/** Jev, a decision model on Workers AI, picks from every emoji name. */
export const decisionSearch = api("decision", "/api/decide");
