// In-memory stand-ins for the AI (Workers AI + AI Gateway) and Vectorize bindings.
import type { Env } from "../src/env";

/** A deterministic "embedding": bag of words hashed into 1024 buckets, normalized. */
export function fakeEmbed(text: string): number[] {
  const v = new Array(1024).fill(0);
  for (const word of text.toLowerCase().replace(/^represent this sentence for searching relevant passages: /, "").split(/[^a-z0-9]+/).filter(Boolean)) {
    let h = 2166136261;
    for (const c of word) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    v[(h >>> 0) % 1024] += 1;
  }
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}

export type GatewayCall = { gateway: string; provider: string; endpoint: string; headers: Record<string, unknown>; query: any };

export function mockEnv(overrides: Partial<Env> & { gateway?: (call: GatewayCall) => Response | Promise<Response> } = {}) {
  const store = new Map<string, VectorizeVector>();
  const aiCalls: { model: string; text: string[] }[] = [];
  const gatewayCalls: GatewayCall[] = [];
  const upserts: VectorizeVector[][] = [];
  const queries: { topK?: number; returnMetadata?: unknown }[] = [];

  const AI = {
    async run(model: string, input: { text: string[] }) {
      aiCalls.push({ model, text: input.text });
      if (input.text.length > 100) throw new Error("batch too large");
      return { shape: [input.text.length, 1024], data: input.text.map(fakeEmbed) };
    },
    gateway(id: string) {
      return {
        async run(data: { provider: string; endpoint: string; headers: Record<string, unknown>; query: unknown }) {
          const call = { gateway: id, ...data } as GatewayCall;
          gatewayCalls.push(call);
          if (!overrides.gateway) throw new Error("no gateway mock");
          return overrides.gateway(call);
        },
      };
    },
  } as unknown as Ai;

  const EMOJI_INDEX = {
    async upsert(vectors: VectorizeVector[]) {
      upserts.push(vectors);
      for (const v of vectors) store.set(v.id, v);
      return { mutationId: `m${upserts.length}` };
    },
    async describe() {
      return { vectorCount: store.size, dimensions: 1024 };
    },
    async query(vector: number[], options: { topK?: number; returnMetadata?: unknown } = {}) {
      queries.push(options);
      const matches = [...store.values()]
        .map((v) => ({ id: v.id, score: (v.values as number[]).reduce((s, x, i) => s + x * vector[i]!, 0), metadata: v.metadata }))
        .sort((a, b) => b.score - a.score)
        .slice(0, options.topK ?? 5);
      return { matches, count: matches.length };
    },
  } as unknown as Vectorize;

  const env: Env = {
    AI,
    EMOJI_INDEX,
    ALLOWED_ORIGINS: "http://localhost:*,https://emoji.example.com",
    AI_GATEWAY_ID: "default",
    JEV_PROVIDER: "custom-typesafe",
    JEV_MODEL: "jev-latest",
    TYPESAFE_API_KEY: "ts-key",
    ADMIN_TOKEN: "admin",
    ...overrides,
  };
  return { env, store, aiCalls, gatewayCalls, upserts, queries };
}

export const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://emoji-search.example.workers.dev${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:5199", ...headers },
    body: JSON.stringify(body),
  });
