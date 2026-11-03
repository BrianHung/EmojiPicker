// POST /embed-search { query, limit?, custom? }
// Embed the query with Workers AI (bge-large-en-v1.5, 1024-d), then take the nearest
// emoji from Vectorize (cosine).
import { QUERY_PREFIX } from "./corpus";
import type { Env } from "./env";

export const EMBEDDING_MODEL = "@cf/baai/bge-large-en-v1.5";
export const DIMENSIONS = 1024;

export type Hit = { unified: string; score: number; custom?: true; imageUrl?: string };

export type EmbedSearchResponse = {
  hits: Hit[];
  timings: { embedMs: number; queryMs: number };
  usage: { model: string; queryTokens: number };
};

/** Embeds texts with bge-large. Returns one 1024-d vector per text. */
export async function embed(env: Env, text: string[]): Promise<number[][]> {
  const out = (await env.AI.run(EMBEDDING_MODEL, { text })) as { data?: number[][] };
  if (!out?.data || out.data.length !== text.length) throw new Error("Workers AI returned no embeddings");
  return out.data;
}

export async function embedSearch(env: Env, { query, limit, custom }: { query: string; limit: number; custom: boolean }): Promise<EmbedSearchResponse> {
  const t0 = performance.now();
  const [vector] = await embed(env, [QUERY_PREFIX + query]);
  const t1 = performance.now();
  // Metadata says which vectors are custom emoji; with it, topK is capped at 50.
  // Excluding custom emoji over-fetches, then filters.
  const result = await env.EMOJI_INDEX.query(vector!, { topK: custom ? limit : 50, returnMetadata: "all" });
  const t2 = performance.now();
  const hits: Hit[] = [];
  for (const match of result.matches) {
    const isCustom = match.metadata?.custom === true;
    if (isCustom && !custom) continue;
    hits.push(isCustom ? { unified: match.id, score: match.score, custom: true, imageUrl: String(match.metadata?.imageUrl ?? "") || undefined } : { unified: match.id, score: match.score });
    if (hits.length >= limit) break;
  }
  return {
    hits,
    // Workers' clock only advances across I/O, which is exactly what these measure.
    timings: { embedMs: Math.round(t1 - t0), queryMs: Math.round(t2 - t1) },
    usage: { model: EMBEDDING_MODEL, queryTokens: estimateTokens(QUERY_PREFIX + query) },
  };
}

/** About 4 characters per token for English; used only for the cost estimate. */
export const estimateTokens = (text: string) => Math.ceil(text.length / 4);
