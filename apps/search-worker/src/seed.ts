// POST /admin/seed { from?, count?, custom? }   Authorization: Bearer <ADMIN_TOKEN>
// Embeds the corpus with Workers AI and upserts it into Vectorize. Idempotent: vector
// ids are unified codes (or custom emoji ids), so running it again overwrites.
// With `custom` in the body, it indexes that list instead (your exported Slack or
// Discord emoji), tagged { custom: true, imageUrl } so searches can include or skip them.
import { BUILT_IN, CUSTOM, embedText, fromCustom, type CustomEmoji, type Entry } from "./corpus";
import { embed } from "./embed-search";
import type { Env } from "./env";

/** A malformed request: answered with 400. */
export class BadRequest extends Error {}

/** Texts per Workers AI call. */
export const EMBED_BATCH = 100;
/** Workers AI calls in flight. */
const CONCURRENCY = 6;
/** Vectors per Vectorize upsert. */
const UPSERT_BATCH = 500;

export type SeedRequest = { from?: number; count?: number; custom?: CustomEmoji[] };
export type SeedResponse = { total: number; from: number; next: number; done: boolean; upserted: number; mutationIds: string[] };

export function validateCustom(list: unknown): CustomEmoji[] {
  if (!Array.isArray(list)) throw new BadRequest("custom: expected an array");
  for (const c of list) {
    if (typeof c?.id !== "string" || typeof c?.name !== "string" || typeof c?.imageUrl !== "string") throw new BadRequest("custom: each emoji needs id, name and imageUrl strings");
    if (new TextEncoder().encode(c.id).length > 64) throw new BadRequest(`custom: id "${c.id}" is longer than 64 bytes (Vectorize's id limit)`);
  }
  return list as CustomEmoji[];
}

export async function seed(env: Env, { from = 0, count = Infinity, custom }: SeedRequest): Promise<SeedResponse> {
  const corpus: Entry[] = custom ? fromCustom(validateCustom(custom)) : [...BUILT_IN, ...CUSTOM];
  const slice = corpus.slice(from, from + count);
  const batches: Entry[][] = [];
  for (let i = 0; i < slice.length; i += EMBED_BATCH) batches.push(slice.slice(i, i + EMBED_BATCH));

  const vectors: VectorizeVector[] = [];
  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const group = batches.slice(i, i + CONCURRENCY);
    const embedded = await Promise.all(group.map((batch) => embed(env, batch.map(embedText))));
    group.forEach((batch, b) =>
      batch.forEach((e, j) =>
        vectors.push({
          id: e.id,
          values: embedded[b]![j]!,
          metadata: e.custom ? { custom: true, name: e.name, imageUrl: e.custom.imageUrl } : { custom: false },
        }),
      ),
    );
  }

  const mutationIds: string[] = [];
  for (let i = 0; i < vectors.length; i += UPSERT_BATCH) {
    const result = await env.EMOJI_INDEX.upsert(vectors.slice(i, i + UPSERT_BATCH));
    mutationIds.push(result.mutationId);
  }
  const next = from + slice.length;
  return { total: corpus.length, from, next, done: next >= corpus.length, upserted: vectors.length, mutationIds };
}
