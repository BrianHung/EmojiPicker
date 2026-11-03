// The emoji the Worker searches: the built-in set (data/emoji.json, from
// @brianhung/emoji-picker) plus your custom emoji (data/custom-emoji.json).
import builtIn from "../data/emoji.json";
import customEmoji from "../data/custom-emoji.json";

/** The library's CustomEmoji, plus an optional one-line description for embedding. */
export type CustomEmoji = {
  id: string;
  name: string;
  imageUrl: string;
  shortcodes?: string[];
  tags?: string[];
  group?: string;
  description?: string;
};

export type Entry = {
  /** Unified code, or the custom emoji's id. Also the Vectorize vector id. */
  id: string;
  name: string;
  shortcodes: readonly string[];
  tags: readonly string[];
  description?: string;
  custom?: { imageUrl: string };
};

export const BUILT_IN: Entry[] = (builtIn.emoji as [string, string, string[], string[]][]).map(([id, name, shortcodes, tags]) => ({ id, name, shortcodes, tags }));

export const fromCustom = (list: readonly CustomEmoji[]): Entry[] =>
  list.map((c) => ({ id: c.id, name: c.name, shortcodes: c.shortcodes ?? [], tags: c.tags ?? [], description: c.description, custom: { imageUrl: c.imageUrl } }));

export const CUSTOM: Entry[] = fromCustom(customEmoji as CustomEmoji[]);

/** What gets embedded: name, shortcodes, tags, then the description when there is one. */
export const embedText = (e: Pick<Entry, "name" | "shortcodes" | "tags" | "description">) =>
  [e.name, e.shortcodes.map((s) => s.replace(/_/g, " ")).join(", "), e.tags.join(", "), e.description].filter(Boolean).join(". ");

/** BGE v1.5's retrieval instruction, prepended to short queries (not to the corpus). */
export const QUERY_PREFIX = "Represent this sentence for searching relevant passages: ";
