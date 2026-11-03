// The emoji the Worker searches: the library's built-in set plus the custom emoji the
// page uses (src/lib/semantic-search/custom-emoji.json; replace it with your own).
import dataset from "@brianhung/emoji-picker/data/en.json";
import customEmoji from "../src/lib/semantic-search/custom-emoji.json";

export { emojiText, QUERY_PREFIX } from "../src/lib/semantic-search/emoji-text";

/** The library's CustomEmoji, plus an optional one-line description. */
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

// Dataset rows are [unified, name, tags, shortcodes, group, version, tones].
export const BUILT_IN: Entry[] = (dataset.emojis as unknown as [string, string, string[], string[]][]).map(([id, name, tags, shortcodes]) => ({ id, name, shortcodes, tags }));

export const fromCustom = (list: readonly CustomEmoji[]): Entry[] =>
  list.map((c) => ({ id: c.id, name: c.name, shortcodes: c.shortcodes ?? [], tags: c.tags ?? [], description: c.description, custom: { imageUrl: c.imageUrl } }));

export const CUSTOM: Entry[] = fromCustom(customEmoji as CustomEmoji[]);
