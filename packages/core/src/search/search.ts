import type { EmojiRecord } from "../dataset";
import { cached } from "../reactive";
import { createSearchIndex, type SearchIndex, type SearchIndexOptions } from "./search-index";
import { canonicalLocale, createTokenizer, tokenizerFor, type Tokenizer, type WordSegmenter } from "./tokenize";

export type SearchHit = { unified: string; score?: number };

export type SearchContext = {
  records: readonly EmojiRecord[];
  limit: number;
  signal: AbortSignal;
  frequency(unified: string): number;
  locale?: string;
};

export type SearchHits = readonly SearchHit[];
export type EmojiSearch = (query: string, context: SearchContext) => SearchHits | PromiseLike<SearchHits>;

export type ProgressiveHits<T = SearchHits> = PromiseLike<T> & { readonly interim: T };

export const isThenable = <T>(value: T | PromiseLike<T>): value is PromiseLike<T> => typeof (value as PromiseLike<T>)?.then === "function";

export function withInterim<T>(promise: PromiseLike<T>, interim: T): ProgressiveHits<T> {
  return Object.assign(Promise.resolve(promise), { interim });
}

export function interimOf<T>(value: T | PromiseLike<T>): T | undefined {
  return isThenable(value) ? (value as Partial<ProgressiveHits<T>>).interim : undefined;
}

const then = <T, U>(value: T | PromiseLike<T>, fn: (value: T) => U | PromiseLike<U>): U | PromiseLike<U> => {
  if (!isThenable(value)) return fn(value);
  const next = value.then(fn);
  const interim = interimOf(value);
  if (interim === undefined) return next;
  const early = fn(interim);
  return isThenable(early) ? next : withInterim(next, early);
};
const all = <T>(values: (T | PromiseLike<T>)[]): T[] | PromiseLike<T[]> => (values.some(isThenable) ? Promise.all(values) : (values as T[]));

const indexes = new WeakMap<readonly EmojiRecord[], Map<Tokenizer, Map<string, SearchIndex>>>();
export function indexFor(records: readonly EmojiRecord[], { locale, tokenize = tokenizerFor(locale) }: SearchIndexOptions = {}): SearchIndex {
  const byTokenizer = cached(indexes, records, () => new Map<Tokenizer, Map<string, SearchIndex>>());
  const byLocale = cached(byTokenizer, tokenize, () => new Map<string, SearchIndex>());
  return cached(byLocale, canonicalLocale(locale) ?? "", () => createSearchIndex(records, { locale, tokenize }));
}

const toHits = (records: readonly EmojiRecord[]): SearchHits => records.map((r) => ({ unified: r.unified }));
const dedupe = (hits: SearchHits, limit: number): SearchHits => {
  const seen = new Set<string>();
  const out: SearchHit[] = [];
  for (const hit of hits) {
    if (seen.has(hit.unified)) continue;
    seen.add(hit.unified);
    out.push(hit);
    if (out.length >= limit) break;
  }
  return out;
};

export type LexicalOptions = {
  typos?: boolean;
  typoThreshold?: number;
  locale?: string;
  segmenter?: WordSegmenter | false;
  tokenize?: Tokenizer;
};

export function lexical({ typos = true, typoThreshold = 8, locale, segmenter, tokenize }: LexicalOptions = {}): EmojiSearch {
  const tokenizers = new Map<string, Tokenizer>();
  const tokenizerOf = (tag: string | undefined) => tokenize ?? (segmenter === undefined ? tokenizerFor(tag) : cached(tokenizers, tag ?? "", () => createTokenizer({ locale: tag, segmenter })));
  return (query, context) => {
    const { records, limit } = context;
    const tag = locale ?? context.locale;
    const index = indexFor(records, { locale: tag, tokenize: tokenizerOf(tag) });
    const exact = index.search(query, limit);
    if (!typos || exact.length >= typoThreshold) return toHits(exact);
    const corrected = correctQuery(query, index).flatMap((q) => index.search(q, limit));
    return dedupe(toHits([...exact, ...corrected]), limit);
  };
}

function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, prev2[j - 2]! + 1);
      row.push(d);
      if (d < best) best = d;
    }
    if (best > max) return max + 1;
    prev2 = prev;
    prev = row;
  }
  return prev[b.length]!;
}

function correctQuery(query: string, index: SearchIndex): string[] {
  const words = index.tokenize(query);
  const vocabulary = index.vocabulary();
  const known = (w: string) => index.search(w, 1).length > 0;
  const options = words.map((word) => {
    if (word.length < 4 || vocabulary.has(word) || known(word)) return [word];
    const max = word.length >= 8 ? 2 : 1;
    const found: [string, number, number][] = [];
    for (const [key, count] of vocabulary) {
      if (key[0] !== word[0] || Math.abs(key.length - word.length) > max) continue;
      const d = editDistance(word, key, max);
      if (d <= max) found.push([key, d, count]);
    }
    found.sort((a, b) => a[1] - b[1] || b[2] - a[2]);
    return found.length ? found.slice(0, 3).map((f) => f[0]) : [word];
  });
  const variants = options.reduce<string[][]>((acc, choices) => acc.flatMap((v) => choices.map((c) => [...v, c])).slice(0, 9), [[]]);
  const original = words.join(" ");
  return variants.map((v) => v.join(" ")).filter((q) => q !== original);
}

export function fallback(primary: EmojiSearch, secondary: EmojiSearch, { min = 8 }: { min?: number } = {}): EmojiSearch {
  return (query, context) => then(primary(query, context), (first) => (first.length >= min ? first : then(secondary(query, context), (more) => dedupe([...first, ...more], context.limit))));
}

export function progressive(fast: EmojiSearch, slow: EmojiSearch): EmojiSearch {
  return (query, context) => {
    const later = slow(query, context);
    if (!isThenable(later)) return later;
    const now = fast(query, context);
    const settled = Promise.resolve(later).catch((error: unknown) => {
      if (context.signal.aborted) throw error;
      return now;
    });
    return isThenable(now) ? settled : withInterim(settled, now);
  };
}

// Reciprocal rank fusion's constant
const RRF_K = 60;

export function merge(...searches: EmojiSearch[]): EmojiSearch {
  return (query, context) =>
    then(all(searches.map((s) => s(query, context))), (lists) => {
      const scores = new Map<string, number>();
      for (const list of lists) list.forEach((hit, rank) => scores.set(hit.unified, (scores.get(hit.unified) ?? 0) + 1 / (RRF_K + rank)));
      return [...scores]
        .sort((a, b) => b[1] - a[1])
        .slice(0, context.limit)
        .map(([unified, score]) => ({ unified, score }));
    });
}

export type Reranker = (hits: SearchHits, query: string, context: SearchContext) => SearchHits | PromiseLike<SearchHits>;

export function rerank(search: EmojiSearch, ...rerankers: Reranker[]): EmojiSearch {
  return (query, context) => rerankers.reduce<SearchHits | PromiseLike<SearchHits>>((hits, r) => then(hits, (h) => r(h, query, context)), search(query, context));
}

export function preferFrequent({ weight = 0.5 }: { weight?: number } = {}): Reranker {
  return (hits, _query, { frequency }) => {
    const top = Math.max(1, ...hits.map((h) => frequency(h.unified)));
    return hits
      .map((hit, rank) => ({ hit, key: (rank + 1) * (1 - weight * (frequency(hit.unified) / top)) }))
      .sort((a, b) => a.key - b.key)
      .map((x) => x.hit);
  };
}

export function remote(fetcher: (query: string, context: SearchContext) => PromiseLike<readonly (string | SearchHit)[]>): EmojiSearch {
  return (query, context) => then(fetcher(query, context), (list) => list.map((x) => (typeof x === "string" ? { unified: x } : x)));
}
