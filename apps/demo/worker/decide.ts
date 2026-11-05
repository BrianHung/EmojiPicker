// A question takes at most 255 options: round 1 shortlists per chunk of names, round 2 ranks the finalists
import { BUILT_IN, CUSTOM, type Entry } from "./corpus";
import type { Hit } from "./embed-search";
import type { Env } from "./env";
import { binding, UpstreamError } from "./errors";

export const MODEL = "typesafe/jev";
export const PRICE = 0.042 / 1_000_000;

export const MAX_OPTIONS = 255;
export const MAX_QUESTIONS = 64;
const OPTIONS_PER_QUESTION = 250;
const TOKENS_PER_REQUEST = 40_000;
const INSTRUCTIONS = "Which emoji best matches what the user is searching for? Consider meaning, slang and abbreviations, not only exact words.";

export type SystemOneRequest = {
  state: string;
  questions: Record<string, { type: "choice"; instructions: string; criteria: Record<string, null> }>;
};
type ChoiceAnswer = { type: "choice"; choice: string; probabilities: Record<string, number>; confidence?: number };
export type SystemOneResponse = { model: string; answers: Record<string, ChoiceAnswer>; usage: { input_tokens: number; output_tokens: number } };

type DecisionUsage = { inputTokens: number; outputTokens: number; requests: number; costUsd: number };
export type DecisionResponse = { hits: Hit[]; model: string; usage: DecisionUsage; timings: { round1Ms: number; round2Ms: number } };

async function ask(env: Env, request: SystemOneRequest, signal?: AbortSignal): Promise<SystemOneResponse> {
  const out = (await binding(() => env.AI.run(MODEL, request, { gateway: { id: env.AI_GATEWAY_ID }, signal }))) as { result?: SystemOneResponse };
  if (!out?.result?.answers || Object.keys(out.result.answers).length === 0) throw new UpstreamError(`${MODEL} returned no answers`);
  return out.result;
}

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

export async function decisionSearch(env: Env, { query, limit, custom }: { query: string; limit: number; custom: boolean }, signal?: AbortSignal): Promise<DecisionResponse> {
  const byLabel = labelOptions(custom ? [...BUILT_IN, ...CUSTOM] : BUILT_IN);
  const usage: DecisionUsage = { inputTokens: 0, outputTokens: 0, requests: 0, costUsd: 0 };
  const request = async (questions: string[][]) => {
    const criteria = (options: string[]) => Object.fromEntries(options.map((o) => [o, null]));
    const response = await ask(env, { state: query, questions: Object.fromEntries(questions.map((options, i) => [`q${i}`, { type: "choice", instructions: INSTRUCTIONS, criteria: criteria(options) }])) }, signal);
    usage.inputTokens += response.usage?.input_tokens ?? 0;
    usage.outputTokens += response.usage?.output_tokens ?? 0;
    usage.requests += 1;
    return response;
  };

  const t0 = performance.now();
  const questions = chunk([...byLabel.keys()], OPTIONS_PER_QUESTION);
  const perQuestion = Math.max(4, Math.min(Math.ceil((limit * 2) / questions.length), Math.floor(MAX_OPTIONS / questions.length)));
  const round1 = await Promise.all(pack(questions, TOKENS_PER_REQUEST).map(request));
  const finalists = round1.flatMap((r) => Object.values(r.answers).flatMap((a) => top(a.probabilities, perQuestion).map(([label]) => label)));
  const t1 = performance.now();

  const round2 = await request([finalists]);
  const t2 = performance.now();

  const hits: Hit[] = top(round2.answers.q0?.probabilities ?? {}, limit).flatMap(([label, score]) => {
    const e = byLabel.get(label);
    if (!e) return [];
    return e.custom ? [{ unified: e.id, score, custom: true as const, imageUrl: e.custom.imageUrl }] : [{ unified: e.id, score }];
  });
  usage.costUsd = usage.inputTokens * PRICE;
  return { hits, model: round2.model ?? MODEL, usage, timings: { round1Ms: Math.round(t1 - t0), round2Ms: Math.round(t2 - t1) } };
}
