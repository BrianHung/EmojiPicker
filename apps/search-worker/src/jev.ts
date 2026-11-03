// POST /jev { query, limit?, custom? }
// TypeSafe's Jev answers a "choice" question with a probability per option. It takes
// at most 255 options per question, so every emoji name can't be one question:
//   round 1  the names split into questions of <= 255 options, packed into as few
//            requests as fit, all in parallel; keep each question's top options
//   round 2  one question over those finalists; its probabilities are the ranking
// Requests go through AI Gateway (custom provider), which logs, caches and meters them.
import { BUILT_IN, CUSTOM, type Entry } from "./corpus";
import type { Env } from "./env";
import type { Hit } from "./embed-search";

/** USD per input token, jev-1.13.0. Output tokens are free. */
export const JEV_INPUT_PRICE = 0.042 / 1_000_000;
export const MAX_OPTIONS = 255;
const OPTIONS_PER_QUESTION = 250;
/** Input tokens per request, leaving room under Jev's 64k. */
const TOKENS_PER_REQUEST = 40_000;
const INSTRUCTIONS = "Which emoji best matches what the user is searching for? Consider meaning, slang and abbreviations, not only exact words.";

type ChoiceAnswer = { type: "choice"; choice: string; probabilities: Record<string, number>; confidence?: number };
type SystemOneResponse = { model: string; answers: Record<string, ChoiceAnswer>; usage?: { input_tokens?: number; output_tokens?: number } };

export type JevUsage = { inputTokens: number; outputTokens: number; requests: number; costUsd: number };
export type JevResponse = { hits: Hit[]; model: string; usage: JevUsage; timings: { round1Ms: number; round2Ms: number } };

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
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

/** Packs questions into requests under the token budget. */
export function pack(questions: string[][], budget = TOKENS_PER_REQUEST): string[][][] {
  const requests: string[][][] = [];
  let current: string[][] = [];
  let tokens = 0;
  for (const q of questions) {
    const t = estimate(q);
    if (current.length && tokens + t > budget) {
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

async function ask(env: Env, query: string, questions: string[][], signal?: AbortSignal): Promise<SystemOneResponse> {
  const body = {
    model: env.JEV_MODEL,
    state: query,
    questions: Object.fromEntries(questions.map((options, i) => [`q${i}`, { type: "choice", instructions: INSTRUCTIONS, criteria: Object.fromEntries(options.map((o) => [o, null])) }])),
  };
  const response = await env.AI.gateway(env.AI_GATEWAY_ID).run(
    {
      provider: env.JEV_PROVIDER,
      endpoint: "v1/systemone",
      headers: {
        Authorization: `Bearer ${env.TYPESAFE_API_KEY}`,
        "Content-Type": "application/json",
        // Lets AI Gateway's analytics show what Jev costs.
        "cf-aig-custom-cost": { per_token_in: JEV_INPUT_PRICE, per_token_out: 0 },
      },
      query: body,
    },
    { signal },
  );
  if (!response.ok) throw new UpstreamError(`Jev ${response.status}: ${(await response.text()).slice(0, 300)}`, response.status);
  return (await response.json()) as SystemOneResponse;
}

const top = (probabilities: Record<string, number>, n: number) =>
  Object.entries(probabilities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);

export async function jevSearch(env: Env, { query, limit, custom }: { query: string; limit: number; custom: boolean }, signal?: AbortSignal): Promise<JevResponse> {
  const byLabel = labelOptions(custom ? [...BUILT_IN, ...CUSTOM] : BUILT_IN);
  const usage: JevUsage = { inputTokens: 0, outputTokens: 0, requests: 0, costUsd: 0 };
  const count = (r: SystemOneResponse) => {
    usage.inputTokens += r.usage?.input_tokens ?? 0;
    usage.outputTokens += r.usage?.output_tokens ?? 0;
    usage.requests += 1;
  };

  const t0 = performance.now();
  const questions = chunk([...byLabel.keys()], OPTIONS_PER_QUESTION);
  // Enough finalists from each question that round 2 can fill `limit`, within 255 options.
  const perQuestion = Math.max(4, Math.min(Math.ceil((limit * 2) / questions.length), Math.floor(MAX_OPTIONS / questions.length)));
  const round1 = await Promise.all(pack(questions).map((qs) => ask(env, query, qs, signal)));
  round1.forEach(count);
  const finalists = round1.flatMap((r) => Object.values(r.answers).flatMap((a) => top(a.probabilities, perQuestion).map(([label]) => label)));
  const t1 = performance.now();

  const round2 = await ask(env, query, [finalists], signal);
  count(round2);
  const t2 = performance.now();

  const answer = round2.answers.q0;
  const hits: Hit[] = top(answer?.probabilities ?? {}, limit).flatMap(([label, score]) => {
    const e = byLabel.get(label);
    if (!e) return [];
    return e.custom ? [{ unified: e.id, score, custom: true as const, imageUrl: e.custom.imageUrl }] : [{ unified: e.id, score }];
  });
  usage.costUsd = usage.inputTokens * JEV_INPUT_PRICE;
  return { hits, model: round2.model, usage, timings: { round1Ms: Math.round(t1 - t0), round2Ms: Math.round(t2 - t1) } };
}
