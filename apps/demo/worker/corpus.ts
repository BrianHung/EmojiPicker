import dataset from "@brianhung/emoji-picker/data/en.json";
import customEmoji from "../src/lib/semantic-search/custom-emoji.json";

export { emojiText, QUERY_PREFIX } from "../src/lib/semantic-search/emoji-text";

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
  id: string;
  name: string;
  shortcodes: readonly string[];
  tags: readonly string[];
  description?: string;
  custom?: { imageUrl: string };
};

export const BUILT_IN: Entry[] = (dataset.emojis as unknown as [string, string, string[], string[]][]).map(([id, name, tags, shortcodes]) => ({ id, name, shortcodes, tags }));

export const fromCustom = (list: readonly CustomEmoji[]): Entry[] => list.map((c) => ({ id: c.id, name: c.name, shortcodes: c.shortcodes ?? [], tags: c.tags ?? [], description: c.description, custom: { imageUrl: c.imageUrl } }));

export const CUSTOM: Entry[] = fromCustom(customEmoji as CustomEmoji[]);
