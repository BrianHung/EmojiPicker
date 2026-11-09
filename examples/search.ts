import Fuse from "fuse.js";
import { lexicalSearch, type EmojiRecord, type EmojiSearch } from "emoji-components";

const exact = lexicalSearch();
const fuses = new WeakMap<readonly EmojiRecord[], Fuse<EmojiRecord>>();

// Fuzzy matches fill in when the default finds fewer than 8
export const withFuzzy: EmojiSearch = (query, context) => {
  const hits = exact(query, context);
  if (hits.length >= 8) return hits;
  let fuse = fuses.get(context.records);
  if (!fuse) fuses.set(context.records, (fuse = new Fuse([...context.records], { keys: [{ name: "name", weight: 3 }, "shortcodes", { name: "tags", weight: 0.5 }], threshold: 0.4, ignoreLocation: true })));
  return [...hits, ...fuse.search(query, { limit: context.limit }).map((r) => ({ unified: r.item.unified }))];
};

// The user's frequently used emoji move up the default ranking
export const frequentFirst: EmojiSearch = (query, context) => {
  const hits = exact(query, context);
  const top = Math.max(1, ...hits.map((h) => context.frequency(h.unified)));
  const rank = (unified: string, i: number) => (i + 1) * (1 - 0.6 * (context.frequency(unified) / top));
  return hits
    .map((hit, i) => ({ hit, key: rank(hit.unified, i) }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.hit);
};

// A server's ranking, with the default when it fails or finds little
export const serverSearch =
  (url: string): EmojiSearch =>
  async (query, context) => {
    try {
      const response = await fetch(`${url}?q=${encodeURIComponent(query)}&limit=${context.limit}`, { signal: context.signal });
      const hits: { unified: string }[] = await response.json();
      return hits.length >= 8 ? hits : [...hits, ...exact(query, context)];
    } catch (error) {
      if (context.signal.aborted) throw error;
      return exact(query, context);
    }
  };
