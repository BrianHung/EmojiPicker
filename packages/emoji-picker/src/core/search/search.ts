// Search is a function. The picker, useEmojiSearch and the results grid only call
// one; everything here (lexical, typos, fallback, merge, rerank, adapters) is an
// optional building block for writing one.
import type { EmojiRecord } from "../dataset";
import { createSearchIndex, type SearchIndex, type SearchIndexOptions } from "./search-index";
import { canonicalLocale, createTokenizer, tokenizerFor, type Tokenizer, type WordSegmenter } from "./tokenize";

/** One result. `score` is the engine's own relevance, higher is better; only its order is used. */
export type SearchHit = { unified: string; score?: number };

export type SearchContext = {
  /** Every emoji the provider knows, custom ones included. */
  records: readonly EmojiRecord[];
  /** How many hits the caller will show. */
  limit: number;
  /** Aborted when the query changes; pass it to fetch(). */
  signal: AbortSignal;
  /** The user's decayed use count for a base emoji; 0 when unused. */
  frequency(unified: string): number;
  /** BCP 47 tag of the data: the store's `locale`, else the dataset's. */
  locale?: string;
};

type Hits = readonly SearchHit[];
/**
 * Sync results render in the same frame. A promise keeps the previous results until
 * it settles, unless it carries `interim` hits (see `progressive`), which render at once.
 */
export type EmojiSearch = (query: string, context: SearchContext) => Hits | PromiseLike<Hits>;

/** A pending result with something to show meanwhile: `interim` renders now, the promise replaces it. */
export type ProgressiveHits<T = Hits> = PromiseLike<T> & { readonly interim: T };

export const isThenable = <T,>(value: T | PromiseLike<T>): value is PromiseLike<T> => typeof (value as PromiseLike<T>)?.then === "function";

/** Attaches interim results to a promise. */
export function withInterim<T>(promise: PromiseLike<T>, interim: T): ProgressiveHits<T> {
  return Object.assign(Promise.resolve(promise), { interim });
}

/** The interim results of a progressive promise, if it has them. */
export function interimOf<T>(value: T | PromiseLike<T>): T | undefined {
  return isThenable(value) ? (value as Partial<ProgressiveHits<T>>).interim : undefined;
}

/**
 * Run `fn` on a value that may or may not be a promise, staying sync when it is
 * sync. Interim results go through `fn` too, when it answers them synchronously.
 */
const then = <T, U>(value: T | PromiseLike<T>, fn: (value: T) => U | PromiseLike<U>): U | PromiseLike<U> => {
  if (!isThenable(value)) return fn(value);
  const next = value.then(fn);
  const interim = interimOf(value);
  if (interim === undefined) return next;
  const early = fn(interim);
  return isThenable(early) ? next : withInterim(next, early);
};
const all = <T,>(values: (T | PromiseLike<T>)[]): T[] | PromiseLike<T[]> => (values.some(isThenable) ? Promise.all(values) : (values as T[]));

const cached = <K, V>(map: Map<K, V>, key: K, create: () => V): V => {
  let value = map.get(key);
  if (value === undefined) map.set(key, (value = create()));
  return value;
};

const indexes = new WeakMap<readonly EmojiRecord[], Map<Tokenizer, Map<string, SearchIndex>>>();
/** One index per record list, tokenizer and locale, shared by every search that uses it. */
export function indexFor(records: readonly EmojiRecord[], { locale, tokenize = tokenizerFor(locale), collator }: SearchIndexOptions = {}): SearchIndex {
  if (collator) return createSearchIndex(records, { locale, tokenize, collator });
  let byTokenizer = indexes.get(records);
  if (!byTokenizer) indexes.set(records, (byTokenizer = new Map()));
  const byLocale = cached(byTokenizer, tokenize, () => new Map<string, SearchIndex>());
  return cached(byLocale, canonicalLocale(locale) ?? "", () => createSearchIndex(records, { locale, tokenize }));
}

const toHits = (records: readonly EmojiRecord[]): Hits => records.map((r) => ({ unified: r.unified }));
const dedupe = (hits: Hits, limit: number): Hits => {
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
  /**
   * Correct misspelled words ("rokcet", "hallowelen") when the exact search finds
   * fewer than `typoThreshold` results. Default true.
   */
  typos?: boolean;
  typoThreshold?: number;
  /** BCP 47 tag for case folding, word segmentation and A–Z order. Default: the dataset's (`context.locale`). */
  locale?: string;
  /** Finds words in text without spaces. Default `Intl.Segmenter(locale, { granularity: "word" })`; `false` splits on spaces and punctuation only. */
  segmenter?: WordSegmenter | false;
  /** Replaces tokenization altogether (an n-gram or morphological tokenizer); `locale` and `segmenter` are then unused for words. */
  tokenize?: Tokenizer;
};

/**
 * The default: a sorted word index over shortcodes, names and tags. Every query
 * word must match and the last may be partial; a whole shortcode ranks above a
 * word in a name, which ranks above a tag.
 */
export function lexical({ typos = true, typoThreshold = 8, locale, segmenter, tokenize }: LexicalOptions = {}): EmojiSearch {
  const tokenizers = new Map<string, Tokenizer>();
  const tokenizerOf = (tag: string | undefined) =>
    tokenize ?? (segmenter === undefined ? tokenizerFor(tag) : cached(tokenizers, tag ?? "", () => createTokenizer({ locale: tag, segmenter })));
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

/** Restricted Damerau-Levenshtein (transpositions count once), stopping past `max`. */
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

/**
 * Query variants with each unknown word (4+ letters, no indexed word starts with it)
 * replaced by its closest indexed words: one edit up to 7 letters, two beyond.
 * Ties go to the word more emoji use ("hart" → heart, not harp).
 */
function correctQuery(query: string, index: SearchIndex): string[] {
  const words = index.tokenize(query);
  const vocabulary = index.vocabulary();
  // Some indexed word starts with it: a partial word, not a typo.
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
  // Cartesian product, capped: typos are rare and queries short.
  let variants: string[][] = [[]];
  for (const choices of options) variants = variants.flatMap((v) => choices.map((c) => [...v, c])).slice(0, 9);
  const original = words.join(" ");
  return variants.map((v) => v.join(" ")).filter((q) => q !== original);
}

/** Use `secondary` only to fill in when `primary` finds fewer than `min` results. */
export function fallback(primary: EmojiSearch, secondary: EmojiSearch, { min = 8 }: { min?: number } = {}): EmojiSearch {
  return (query, context) =>
    then(primary(query, context), (first) =>
      first.length >= min ? first : then(secondary(query, context), (more) => dedupe([...first, ...more], context.limit)),
    );
}

/**
 * Show `fast` results at once and replace them with `slow` ones when they arrive:
 * lexical results while an embedding or remote search runs. A newer query aborts
 * the slow one (through `context.signal`); if it fails, the fast results stay.
 */
export function progressive(fast: EmojiSearch, slow: EmojiSearch): EmojiSearch {
  return (query, context) => {
    const later = slow(query, context);
    if (!isThenable(later)) return later;
    const now = fast(query, context);
    const settled = Promise.resolve(later).catch((error: unknown) => {
      if (context.signal.aborted) throw error;
      return now;
    });
    // A `fast` that is itself async has nothing to show early.
    return isThenable(now) ? settled : withInterim(settled, now);
  };
}

/** Run searches together and fuse their rankings (reciprocal rank fusion). */
export function merge(...searches: EmojiSearch[]): EmojiSearch {
  return (query, context) =>
    then(all(searches.map((s) => s(query, context))), (lists) => {
      const scores = new Map<string, number>();
      for (const list of lists) list.forEach((hit, rank) => scores.set(hit.unified, (scores.get(hit.unified) ?? 0) + 1 / (60 + rank)));
      return [...scores].sort((a, b) => b[1] - a[1]).slice(0, context.limit).map(([unified, score]) => ({ unified, score }));
    });
}

/** Reorders a search's results: `(hits, query, context) => hits`. */
export type Reranker = (hits: Hits, query: string, context: SearchContext) => Hits | PromiseLike<Hits>;

/** Pass a search's results through rerankers in order. */
export function rerank(search: EmojiSearch, ...rerankers: Reranker[]): EmojiSearch {
  return (query, context) => rerankers.reduce<Hits | PromiseLike<Hits>>((hits, r) => then(hits, (h) => r(h, query, context)), search(query, context));
}

/**
 * Moves emoji the user picks often up. `weight` 0..1: how far a heavily used emoji
 * can move, as a share of its rank. Default 0.5.
 */
export function preferFrequent({ weight = 0.5 }: { weight?: number } = {}): Reranker {
  return (hits, _query, { frequency }) => {
    const top = Math.max(1, ...hits.map((h) => frequency(h.unified)));
    return hits
      .map((hit, rank) => ({ hit, key: (rank + 1) * (1 - weight * (frequency(hit.unified) / top)) }))
      .sort((a, b) => a.key - b.key)
      .map((x) => x.hit);
  };
}

/** Any async source: an endpoint, an embedding search, a classifier. Return unified codes or hits. */
export function remote(fetcher: (query: string, context: SearchContext) => PromiseLike<readonly (string | SearchHit)[]>): EmojiSearch {
  return (query, context) => then(fetcher(query, context), (list) => list.map((x) => (typeof x === "string" ? { unified: x } : x)));
}

type FuseLike<T> = { search(query: string, options?: { limit?: number }): { item: T; score?: number }[] };
type FuseConstructor<T> = new (docs: T[], options: object) => FuseLike<T>;
type FuseDoc = { unified: string; name: string; shortcodes: string; tags: string };

/**
 * Fuse.js, passed in so it stays optional: `fuse(Fuse)`. Defaults were tuned on a
 * held-out query set (names, shortcodes, typos); best as `fallback(lexical(), fuse(Fuse))`.
 */
export function fuse(Fuse: FuseConstructor<FuseDoc>, options: object = {}): EmojiSearch {
  const instances = new WeakMap<readonly EmojiRecord[], FuseLike<FuseDoc>>();
  return (query, { records, limit }) => {
    let instance = instances.get(records);
    if (!instance) {
      const docs = records.map((r) => ({ unified: r.unified, name: r.name, shortcodes: r.shortcodes.join(" ").replace(/_/g, " "), tags: r.tags.join(" ") }));
      instance = new Fuse(docs, {
        keys: [{ name: "shortcodes", weight: 1 }, { name: "name", weight: 3 }, { name: "tags", weight: 0.5 }],
        threshold: 0.4,
        ignoreLocation: true,
        includeScore: true,
        ...options,
      });
      instances.set(records, instance);
    }
    return instance.search(query, { limit }).map((r) => ({ unified: r.item.unified, score: 1 - (r.score ?? 0) }));
  };
}
