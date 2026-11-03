// POST /api/decide { query, model: "clef" | "jev", limit?, custom? }
// Clef (Cloudflare) and Jev (TypeSafe) are decision models on Workers AI with the same
// System One protocol: a "choice" question gets a probability per option. They differ
// only in the model id. A question takes at most 255 options, so every emoji name can't
// be one question:
//   round 1  the names split into questions of <= 250 options, packed into as few
//            requests as fit, all in parallel; keep each question's top options
//   round 2  one question over those finalists; its probabilities are the ranking
import { BUILT_IN, CUSTOM, type Entry } from "./corpus";
import type { Env } from "./env";
import { binding, UpstreamError } from "./errors";

export const MODELS = ["clef", "jev"] as const;
export type ModelName = (typeof MODELS)[number];

export const MAX_OPTIONS = 255;
export const MAX_QUESTIONS = 64;
const OPTIONS_PER_QUESTION = 250;
/**
 * Estimated input tokens per request (`estimate` units). Workers AI caps a Clef request at
 * 24,576 real tokens, about 2.3× the estimate for emoji-name options; Jev takes up to 65,536.
 */
const TOKENS_PER_REQUEST: Record<ModelName, number> = { clef: 9_000, jev: 40_000 };
const INSTRUCTIONS = "Which emoji best matches what the user is searching for? Consider meaning, slang and abbreviations, not only exact words.";

/** USD per token. */
export type Price = { input: number; output: number };
const perMillion = (input: number, output = input): Price => ({ input: input / 1_000_000, output: output / 1_000_000 });
export const PRICES: Record<string, Price> = {
  "@cf/cloudflare/clef-flash": perMillion(0.09),
  "@cf/cloudflare/clef": perMillion(0.24),
  // Output tokens are free.
  "typesafe/jev": perMillion(0.042, 0),
};

export type SystemOneRequest = {
  state: string;
  questions: Record<string, { type: "choice"; instructions: string; criteria: Record<string, null> }>;
};
type ChoiceAnswer = { type: "choice"; choice: string; probabilities: Record<string, number>; confidence?: number };
export type SystemOneResponse = { model: string; answers: Record<string, ChoiceAnswer>; usage: { input_tokens: number; output_tokens: number } };

export type Hit = { unified: string; score: number; custom?: true; imageUrl?: string };
export type DecisionUsage = { inputTokens: number; outputTokens: number; requests: number; costUsd: number };
export type DecisionResponse = { hits: Hit[]; model: string; usage: DecisionUsage; timings: { round1Ms: number; round2Ms: number } };

/** The Workers AI model id for a name: CLEF_MODEL or JEV_MODEL. */
export const modelId = (env: Env, name: ModelName) => (name === "clef" ? env.CLEF_MODEL : env.JEV_MODEL);

/**
 * One System One request through the AI binding, logged by AI Gateway. Clef's schema also
 * requires its short model name in the body; Jev's reply comes wrapped in `result`.
 */
export async function ask(env: Env, model: string, request: SystemOneRequest, signal?: AbortSignal): Promise<SystemOneResponse> {
  const body = model.startsWith("@cf/cloudflare/") ? { model: model.slice(model.lastIndexOf("/") + 1), ...request } : request;
  const out = (await binding(() => env.AI.run(model, body, { gateway: { id: env.AI_GATEWAY_ID }, signal }))) as (SystemOneResponse & { result?: undefined }) | { result: SystemOneResponse };
  const response = out?.result ?? out;
  if (!response?.answers || Object.keys(response.answers).length === 0) throw new UpstreamError(`${model} returned no answers`);
  return response as SystemOneResponse;
}

/** Unique option labels: the name, disambiguated when two emoji share one. */
export function labelOptions(entries: readonly Entry[]): Map<string, Entry> {
  const byLabel = new Map<string, Entry>();
  for (const e of entries) {
    let label = e.custom ? `${e.name} (custom)` : e.name;
    for (let n = 2; byLabel.has(label); n++) label = `${e.name} (${n})`;
    byLabel.set(label, e);
  }
  return byLabel;
}

const estimate = (labels: readonly string[]) => labels.reduce((sum, l) => sum + Math.ceil(l.length / 4) + 2, 0);

export function chunk<T>(list: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** Packs questions into requests under the token budget and the per-request question limit. */
export function pack(questions: string[][], budget: number): string[][][] {
  const requests: string[][][] = [];
  let current: string[][] = [];
  let tokens = 0;
  for (const q of questions) {
    const t = estimate(q);
    if (current.length && (tokens + t > budget || current.length === MAX_QUESTIONS)) {
      requests.push(current);
      current = [];
      tokens = 0;
    }
    current.push(q);
    tokens += t;
  }
  if (current.length) requests.push(current);
  return requests;
}

const top = (probabilities: Record<string, number>, n: number) =>
  Object.entries(probabilities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);

export async function decisionSearch(env: Env, { query, limit, custom, model: name }: { query: string; limit: number; custom: boolean; model: ModelName }, signal?: AbortSignal): Promise<DecisionResponse> {
  const model = modelId(env, name);
  const price = PRICES[model] ?? perMillion(0);
  const byLabel = labelOptions(custom ? [...BUILT_IN, ...CUSTOM] : BUILT_IN);
  const usage: DecisionUsage = { inputTokens: 0, outputTokens: 0, requests: 0, costUsd: 0 };
  const request = async (questions: string[][]) => {
    const criteria = (options: string[]) => Object.fromEntries(options.map((o) => [o, null]));
    const response = await ask(env, model, { state: query, questions: Object.fromEntries(questions.map((options, i) => [`q${i}`, { type: "choice", instructions: INSTRUCTIONS, criteria: criteria(options) }])) }, signal);
    usage.inputTokens += response.usage?.input_tokens ?? 0;
    usage.outputTokens += response.usage?.output_tokens ?? 0;
    usage.requests += 1;
    return response;
  };

  const t0 = performance.now();
  const questions = chunk([...byLabel.keys()], OPTIONS_PER_QUESTION);
  // Enough finalists from each question that round 2 can fill `limit`, within 255 options.
  const perQuestion = Math.max(4, Math.min(Math.ceil((limit * 2) / questions.length), Math.floor(MAX_OPTIONS / questions.length)));
  const round1 = await Promise.all(pack(questions, TOKENS_PER_REQUEST[name]).map(request));
  const finalists = round1.flatMap((r) => Object.values(r.answers).flatMap((a) => top(a.probabilities, perQuestion).map(([label]) => label)));
  const t1 = performance.now();

  const round2 = await request([finalists]);
  const t2 = performance.now();

  const hits: Hit[] = top(round2.answers.q0?.probabilities ?? {}, limit).flatMap(([label, score]) => {
    const e = byLabel.get(label);
    if (!e) return [];
    return e.custom ? [{ unified: e.id, score, custom: true as const, imageUrl: e.custom.imageUrl }] : [{ unified: e.id, score }];
  });
  usage.costUsd = usage.inputTokens * price.input + usage.outputTokens * price.output;
  return { hits, model: round2.model ?? model, usage, timings: { round1Ms: Math.round(t1 - t0), round2Ms: Math.round(t2 - t1) } };
}
