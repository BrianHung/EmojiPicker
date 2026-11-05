// In-memory stand-ins for the AI binding (an embedding model and the decision models)
// and the Vectorize binding.
import type { SystemOneRequest, SystemOneResponse } from "../decide";
import { EMBEDDING_MODEL } from "../embed-search";
import type { Env } from "../env";

type DecideCall = { model: string; input: SystemOneRequest; options: AiOptions };
type EmbedCall = { model: string; text: string[] };

export function mockEnv(overrides: Partial<Env> = {}) {
  const store = new Map<string, VectorizeVector>();
  const decideCalls: DecideCall[] = [];
  const embedCalls: EmbedCall[] = [];
  const upserts: VectorizeVector[][] = [];
  const queries: VectorizeQueryOptions[] = [];

  const AI = {
    async run(model: string, input: { text: string[] } | SystemOneRequest, options: AiOptions) {
      if (model === EMBEDDING_MODEL) {
        const { text } = input as { text: string[] };
        embedCalls.push({ model, text });
        if (text.length > 100) throw new Error("batch too large");
        return { shape: [text.length, 1024], data: text.map(fakeEmbed) };
      }
      const request = input as SystemOneRequest;
      decideCalls.push({ model, input: request, options });
      return { result: { model: model.split("/").pop()!, ...decide(request) } };
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
    async query(vector: number[], options: VectorizeQueryOptions = {}) {
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
    ADMIN_TOKEN: "admin",
    ...overrides,
  };
  return { env, store, decideCalls, embedCalls, upserts, queries };
}

export const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://emoji-search.example.workers.dev${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:5199", ...headers },
    body: JSON.stringify(body),
  });

/** A deterministic "embedding": words hashed into 1024 buckets, normalized. */
function fakeEmbed(text: string): number[] {
  const v = new Array<number>(1024).fill(0);
  for (const word of text
    .toLowerCase()
    .replace(/^represent this sentence for searching relevant passages: /, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean)) {
    let h = 2166136261;
    for (const c of word) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    v[(h >>> 0) % 1024]! += 1;
  }
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}

/** A fake System One model: probability by word overlap between the query (state) and each option. */
function decide(request: SystemOneRequest): Omit<SystemOneResponse, "model"> {
  const words = new Set(request.state.toLowerCase().split(/\W+/).filter(Boolean));
  const answers: SystemOneResponse["answers"] = {};
  let tokens = 0;
  if (Object.keys(request.questions).length > 64) throw new Error("too many questions");
  for (const [id, q] of Object.entries(request.questions)) {
    const options = Object.keys(q.criteria);
    if (options.length < 2 || options.length > 255) throw new Error("2-255 options per question");
    const raw = options.map(
      (o) =>
        0.01 +
        o
          .toLowerCase()
          .split(/\W+/)
          .filter((w) => words.has(w)).length,
    );
    const sum = raw.reduce((a, b) => a + b, 0);
    answers[id] = { type: "choice", choice: options[raw.indexOf(Math.max(...raw))]!, probabilities: Object.fromEntries(options.map((o, i) => [o, raw[i]! / sum])) };
    tokens += options.join(" ").length / 4;
  }
  return { answers, usage: { input_tokens: Math.round(tokens), output_tokens: 3 } };
}
