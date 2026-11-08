import type { EmojiRecord } from "./dataset";
import { toError } from "./reactive";
import { tokenizerFor } from "./search/tokenize";

export interface CustomEmoji {
  id: string;
  name: string;
  imageUrl: string;
  shortcodes?: string[];
  tags?: string[];
  group?: string;
  width?: number;
  height?: number;
  animated?: boolean;
  stillUrl?: string;
  base?: string;
}

export type CustomEmojiLoader = (options: { signal: AbortSignal }) => Promise<readonly CustomEmoji[]>;

export type CustomEmojiSource = readonly CustomEmoji[] | CustomEmojiLoader;

export const uniqueById = (list: readonly CustomEmoji[]): readonly CustomEmoji[] => {
  const seen = new Set<string>();
  return list.filter((e) => !seen.has(e.id) && seen.add(e.id));
};

export async function loadCustomEmojis(source: CustomEmojiSource | undefined, signal: AbortSignal): Promise<{ emojis: readonly CustomEmoji[]; errors: Error[] }> {
  try {
    return { emojis: uniqueById(typeof source === "function" ? await source({ signal }) : (source ?? [])), errors: [] };
  } catch (e) {
    return { emojis: [], errors: [toError(e)] };
  }
}

export const splitWords = (text: string): string[] =>
  text
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((w) => w.toLowerCase());

// The record a custom emoji becomes: search words come from its id, shortcodes, tags, and the emoji it is based on
export function customRecord(c: CustomEmoji, { order = 0, base }: { order?: number; base?: EmojiRecord } = {}): EmojiRecord {
  const shortcodes = c.shortcodes ?? [];
  const words = new Set([...(c.tags ?? []), ...splitWords(c.id), ...shortcodes.flatMap(splitWords)]);
  const tokenize = tokenizerFor();
  if (base) for (const word of [...tokenize(base.name), ...base.tags]) words.add(word);
  for (const word of tokenize(c.name)) words.delete(word);
  return {
    unified: c.id,
    emoji: "",
    name: c.name,
    tags: [...words],
    shortcodes,
    group: "custom",
    version: 0,
    tones: [],
    order,
    imageUrl: c.imageUrl,
    ...(c.stillUrl ? { stillUrl: c.stillUrl } : {}),
    ...(c.animated ? { animated: true } : {}),
    ...(c.width ? { width: c.width } : {}),
    ...(c.height ? { height: c.height } : {}),
  };
}

export const customRecords = (customs: readonly CustomEmoji[], firstOrder: number, base: (unified: string) => EmojiRecord | undefined): EmojiRecord[] =>
  customs.map((c, i) => customRecord(c, { order: firstOrder + i, base: c.base ? base(c.base) : undefined }));
