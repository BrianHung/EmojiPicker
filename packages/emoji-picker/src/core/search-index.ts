import type { EmojiRecord } from "./dataset";
import { canonicalLocale, normalizer, tokenizerFor, type Tokenizer } from "./tokenize";

// Lower is better: how a token matched the query. A whole shortcode beats a
// word inside one ("thu" → thumbsup before hand_with_index_finger_and_thumb_crossed).
const SHORTCODE = 0;
const WORD = 1;
const TAG = 2;

export type SearchIndexOptions = {
  /** BCP 47 tag for case folding, word segmentation and A–Z order. Default: the runtime's. */
  locale?: string;
  /** Replaces the default tokenizer, for indexing and queries alike. */
  tokenize?: Tokenizer;
  /** A–Z order of alphabetical completion. Default `new Intl.Collator(locale)`. */
  collator?: Pick<Intl.Collator, "compare">;
};

export type SearchIndex = {
  /** The tokenizer the index was built with. */
  tokenize: Tokenizer;
  /** AND across words; the last word matches as a prefix. Ranked by match quality, then dataset order. */
  search(query: string, limit?: number): EmojiRecord[];
  /** Every indexed word with the number of emoji it appears in, for typo correction. */
  vocabulary(): ReadonlyMap<string, number>;
  /** Exact Slack shortcode lookup, without colons: "thumbsup". */
  byShortcode(code: string): EmojiRecord | undefined;
  /**
   * Slack-style `:smil` autocomplete: exact, then shortcode prefixes, then a word
   * inside a shortcode (`slightly_smiling_face`), then name/tag matches.
   * `order: "alphabetical"` keeps exact and prefix matches first but sorts each
   * group A–Z, and the other matches A–Z after them (Discord).
   */
  completeShortcode(prefix: string, limit?: number, order?: CompletionOrder): ShortcodeCompletion[];
};

/** "relevance" (default): best match, then shortest code. "alphabetical": prefix matches A–Z, then the rest A–Z. */
export type CompletionOrder = "relevance" | "alphabetical";

export type ShortcodeCompletion = {
  record: EmojiRecord;
  shortcode: string;
  /** Matched [start, end) range inside `shortcode`, for highlighting; null for name matches. */
  match: [number, number] | null;
};

/** A sorted token array searched by binary search. Build it once per record list. */
export function createSearchIndex(records: readonly EmojiRecord[], { locale, tokenize = tokenizerFor(locale), collator = new Intl.Collator(canonicalLocale(locale)) }: SearchIndexOptions = {}): SearchIndex {
  const normalize = normalizer(locale);
  const entries: [token: string, id: number, kind: number][] = [];
  const shortcodes = new Map<string, number>();
  const shortcodeList: [code: string, id: number][] = [];

  records.forEach((record, id) => {
    const best = new Map<string, number>();
    const add = (token: string, kind: number) => {
      const prev = best.get(token);
      if (prev === undefined || kind < prev) best.set(token, kind);
    };
    for (const code of record.shortcodes) {
      const lower = normalize(code);
      if (!shortcodes.has(lower)) shortcodes.set(lower, id);
      shortcodeList.push([lower, id]);
      add(lower, SHORTCODE);
      for (const t of tokenize(lower)) add(t, WORD);
    }
    for (const t of tokenize(record.name)) add(t, WORD);
    for (const tag of record.tags) for (const t of tokenize(tag)) add(t, TAG);
    for (const [token, kind] of best) entries.push([token, id, kind]);
  });

  entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[2] - b[2]));
  const keys = entries.map((e) => e[0]);
  const ids = Int32Array.from(entries, (e) => e[1]);
  const kinds = Uint8Array.from(entries, (e) => e[2]);
  shortcodeList.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : records[a[1]]!.order - records[b[1]]!.order));
  const shortcodeKeys = shortcodeList.map((s) => s[0]);
  // Every word of every shortcode, with its offset: "slightly_smiling_face" → slightly@0, smiling@9, face@17.
  const codeWords: [word: string, listIndex: number, offset: number][] = [];
  shortcodeList.forEach(([code], listIndex) => {
    let offset = 0;
    for (const part of code.split("_")) {
      if (part) codeWords.push([part, listIndex, offset]);
      offset += part.length + 1;
    }
  });
  codeWords.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const codeWordKeys = codeWords.map((w) => w[0]);

  const idOf = new Map(records.map((r, i) => [r, i] as const));
  let vocabulary: Map<string, number> | undefined;
  const api: SearchIndex = {
    tokenize,

    vocabulary() {
      if (!vocabulary) {
        vocabulary = new Map();
        for (const key of keys) vocabulary.set(key, (vocabulary.get(key) ?? 0) + 1);
      }
      return vocabulary;
    },

    search(query, limit = Infinity) {
      const words = tokenize(query);
      if (!words.length) return [];
      let scores: Map<number, number> | null = null;
      words.forEach((word, n) => {
        const prefix = n === words.length - 1;
        const next = new Map<number, number>();
        for (let j = lowerBound(keys, word); j < keys.length; j++) {
          const key = keys[j]!;
          if (prefix ? !key.startsWith(word) : key !== word) break;
          // Exact word matches rank above prefix matches.
          const score = kinds[j]! * 2 + (key === word ? 0 : 1);
          const id = ids[j]!;
          const prev = next.get(id);
          if (prev === undefined || score < prev) next.set(id, score);
        }
        if (scores === null) scores = next;
        else {
          const merged = new Map<number, number>();
          for (const [id, s] of next) {
            const prev = scores.get(id);
            if (prev !== undefined) merged.set(id, prev + s);
          }
          scores = merged;
        }
      });
      const ranked = [...scores!].sort((a, b) => a[1] - b[1] || records[a[0]]!.order - records[b[0]]!.order);
      return ranked.slice(0, limit).map(([id]) => records[id]!);
    },

    byShortcode(code) {
      const id = shortcodes.get(normalize(code).replace(/^:|:$/g, ""));
      return id === undefined ? undefined : records[id];
    },

    completeShortcode(prefix, limit = 8, order = "relevance") {
      const p = normalize(prefix);
      // One candidate per emoji: its best-matching shortcode and score.
      const best = new Map<number, ShortcodeCompletion & { score: number }>();
      const offer = (id: number, shortcode: string, score: number, match: [number, number] | null) => {
        const prev = best.get(id);
        if (!prev || score < prev.score || (score === prev.score && shortcode.length < prev.shortcode.length)) {
          best.set(id, { record: records[id]!, shortcode, match, score });
        }
      };
      // 0 exact, 1 shortcode prefix (":smil" → smile), 2 a word inside one (→ slightly_smiling_face)
      for (let j = lowerBound(codeWordKeys, p); j < codeWordKeys.length; j++) {
        if (!codeWordKeys[j]!.startsWith(p)) break;
        const [, listIndex, offset] = codeWords[j]!;
        const [code, id] = shortcodeList[listIndex]!;
        offer(id, code, code === p ? 0 : offset === 0 ? 1 : 2, [offset, offset + p.length]);
      }
      // Codes typed with separators (":smiling_f") only match as a whole prefix.
      if (/[_\-]/.test(p)) {
        for (let j = lowerBound(shortcodeKeys, p); j < shortcodeKeys.length && shortcodeKeys[j]!.startsWith(p); j++) {
          const [code, id] = shortcodeList[j]!;
          offer(id, code, code === p ? 0 : 1, [0, p.length]);
        }
      }
      // 3: name or tag matches ("smiling" → :blush: via "smiling face with smiling eyes"), shown by their first code.
      if (!/[_\-]/.test(p)) for (const record of api.search(p, limit * 2)) {
        const id = idOf.get(record)!;
        if (record.shortcodes[0]) offer(id, normalize(record.shortcodes[0]), 3, null);
      }
      const relevance = (a: { score: number; shortcode: string; record: EmojiRecord }, b: typeof a) => a.score - b.score || a.shortcode.length - b.shortcode.length || a.record.order - b.record.order;
      // Alphabetical: exact, then prefixes A–Z, then everything else A–Z.
      const tier = (score: number) => (score <= 1 ? score : 2);
      const alphabetical = (a: { score: number; shortcode: string }, b: typeof a) => tier(a.score) - tier(b.score) || collator.compare(a.shortcode, b.shortcode);
      return [...best.values()]
        .sort(order === "alphabetical" ? alphabetical : relevance)
        .slice(0, limit)
        .map(({ score: _score, ...rest }) => rest);
    },
  };
  return api;
}

function lowerBound(keys: readonly string[], target: string) {
  let lo = 0;
  let hi = keys.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (keys[mid]! < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
