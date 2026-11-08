import { QUERY_PREFIX } from "./corpus";
import type { Env } from "./env";
import { binding, Unavailable } from "./errors";

export const EMBEDDING_MODEL = "@cf/baai/bge-large-en-v1.5";

export type Hit = { unified: string; score: number; custom?: true; imageUrl?: string };
export type EmbedSearchResponse = { hits: Hit[]; model: string; timings: { embedMs: number; queryMs: number } };

export async function embed(env: Env, text: string[]): Promise<number[][]> {
  const out = (await binding(() => env.AI.run(EMBEDDING_MODEL, { text }))) as { data?: number[][] };
  if (out?.data?.length !== text.length) throw new Unavailable("Workers AI returned no embeddings");
  return out.data;
}

export async function embedSearch(env: Env, { query, limit, custom }: { query: string; limit: number; custom: boolean }): Promise<EmbedSearchResponse> {
  const t0 = performance.now();
  const [vector] = await embed(env, [QUERY_PREFIX + query]);
  const t1 = performance.now();
  const { matches } = await binding(() => env.EMOJI_INDEX.query(vector!, { topK: custom ? limit : 50, returnMetadata: "all" }));
  const t2 = performance.now();
  if (matches.length === 0) {
    const info = await env.EMOJI_INDEX.describe().catch(() => null);
    if (info?.vectorCount === 0) throw new Unavailable("The Vectorize index is empty. Run `npm run seed`.");
  }
  const hits: Hit[] = [];
  for (const match of matches) {
    const isCustom = match.metadata?.custom === true;
    if (isCustom && !custom) continue;
    hits.push(isCustom ? { unified: match.id, score: match.score, custom: true, imageUrl: String(match.metadata?.imageUrl ?? "") || undefined } : { unified: match.id, score: match.score });
    if (hits.length === limit) break;
  }
  return { hits, model: EMBEDDING_MODEL, timings: { embedMs: Math.round(t1 - t0), queryMs: Math.round(t2 - t1) } };
}
