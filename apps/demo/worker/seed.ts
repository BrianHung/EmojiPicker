// POST /api/admin/seed { from?, count?, custom? }   Authorization: Bearer <ADMIN_TOKEN>
// Embeds the corpus with Workers AI and upserts it into Vectorize. Vector ids are unified
// codes (or custom emoji ids), so running it again overwrites. With `custom`, it indexes
// that list instead, tagged { custom: true, imageUrl } so a search can include or skip it.
import { BUILT_IN, CUSTOM, emojiText, fromCustom, type CustomEmoji, type Entry } from "./corpus";
import { embed } from "./embed-search";
import type { Env } from "./env";
import { BadRequest, binding } from "./errors";

/** Texts per Workers AI call. */
const EMBED_BATCH = 100;
/** Workers AI calls in flight. */
const CONCURRENCY = 6;
/** Vectors per Vectorize upsert. */
const UPSERT_BATCH = 500;

export type SeedRequest = { from: number; count: number; custom?: CustomEmoji[] };
export type SeedResponse = { total: number; from: number; next: number; done: boolean; upserted: number; mutationIds: string[] };

export function parseSeed(body: unknown): SeedRequest {
  const { from = 0, count = Number.MAX_SAFE_INTEGER, custom } = (body ?? {}) as Record<string, unknown>;
  if (typeof from !== "number" || !Number.isInteger(from) || from < 0) throw new BadRequest("from: expected a non-negative integer");
  if (typeof count !== "number" || !Number.isInteger(count) || count < 1) throw new BadRequest("count: expected a positive integer");
  if (custom === undefined) return { from, count };
  if (!Array.isArray(custom)) throw new BadRequest("custom: expected an array");
  for (const c of custom) {
    if (typeof c?.id !== "string" || typeof c?.name !== "string" || typeof c?.imageUrl !== "string") throw new BadRequest("custom: each emoji needs id, name and imageUrl strings");
    if (new TextEncoder().encode(c.id).length > 64) throw new BadRequest(`custom: id "${c.id}" is longer than 64 bytes, Vectorize's limit`);
  }
  return { from, count, custom: custom as CustomEmoji[] };
}

/** Compares the Authorization header with the secret in constant time. */
export async function authorized(request: Request, token: string): Promise<boolean> {
  const digest = async (s: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  const [a, b] = await Promise.all([digest(request.headers.get("authorization") ?? ""), digest(`Bearer ${token}`)]);
  return a.reduce((diff, byte, i) => diff | (byte ^ b[i]!), 0) === 0;
}

export async function seed(env: Env, { from, count, custom }: SeedRequest): Promise<SeedResponse> {
  const corpus: Entry[] = custom ? fromCustom(custom) : [...BUILT_IN, ...CUSTOM];
  const slice = corpus.slice(from, from + count);
  const batches: Entry[][] = [];
  for (let i = 0; i < slice.length; i += EMBED_BATCH) batches.push(slice.slice(i, i + EMBED_BATCH));

  const vectors: VectorizeVector[] = [];
  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const group = batches.slice(i, i + CONCURRENCY);
    const embedded = await Promise.all(group.map((batch) => embed(env, batch.map(emojiText))));
    group.forEach((batch, b) => batch.forEach((e, j) => vectors.push({ id: e.id, values: embedded[b]![j]!, metadata: e.custom ? { custom: true, name: e.name, imageUrl: e.custom.imageUrl } : { custom: false } })));
  }

  const mutationIds: string[] = [];
  for (let i = 0; i < vectors.length; i += UPSERT_BATCH) {
    const { mutationId } = await binding(() => env.EMOJI_INDEX.upsert(vectors.slice(i, i + UPSERT_BATCH)));
    mutationIds.push(mutationId);
  }
  const next = from + slice.length;
  return { total: corpus.length, from, next, done: next >= corpus.length, upserted: vectors.length, mutationIds };
}
