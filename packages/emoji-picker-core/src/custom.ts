import type { EmojiRecord } from "./dataset";
import { cached } from "./reactive";
import { tokenizerFor } from "./search/tokenize";

export type CustomEmoji = {
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
};

export type CustomEmojiLoader = (options: { signal: AbortSignal }) => Promise<readonly CustomEmoji[]>;

export type CustomEmojiSource = CustomEmoji | readonly CustomEmoji[] | string | CustomEmojiLoader;

export function splitWords(text: string): string[] {
  return text
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

const byUrl = new Map<string, Promise<readonly CustomEmoji[]>>();

function fetchPack(url: string): Promise<readonly CustomEmoji[]> {
  return cached(byUrl, url, () => {
    const pending = fetch(url, { priority: "low" } as RequestInit).then((response) => {
      if (!response.ok) throw new Error(`custom emoji ${url}: ${response.status} ${response.statusText}`);
      return response.json() as Promise<readonly CustomEmoji[]>;
    });
    pending.catch(() => byUrl.delete(url));
    return pending;
  });
}

const isSourceList = (value: CustomEmojiSource | readonly CustomEmojiSource[]): value is readonly CustomEmojiSource[] => Array.isArray(value);

export function customSources(value: CustomEmojiSource | readonly CustomEmojiSource[] | undefined): CustomEmojiSource[] {
  if (value == null) return [];
  return isSourceList(value) ? [...value] : [value];
}

type CustomEmojis = { emojis: CustomEmoji[]; errors: Error[] };

const listOf = (source: CustomEmoji | readonly CustomEmoji[]): readonly CustomEmoji[] => (Array.isArray(source) ? source : [source as CustomEmoji]);
const isInline = (source: CustomEmojiSource): source is CustomEmoji | readonly CustomEmoji[] => typeof source === "object";

function merge(lists: readonly (readonly CustomEmoji[] | Error)[]): CustomEmojis {
  const seen = new Set<string>();
  const emojis: CustomEmoji[] = [];
  const errors: Error[] = [];
  for (const list of lists) {
    if (list instanceof Error) {
      errors.push(list);
      continue;
    }
    for (const emoji of list) {
      if (seen.has(emoji.id)) continue;
      seen.add(emoji.id);
      emojis.push(emoji);
    }
  }
  return { emojis, errors };
}

export const inlineCustomEmojis = (sources: readonly CustomEmojiSource[]): CustomEmojis | null => (sources.every(isInline) ? merge(sources.map(listOf)) : null);

export async function loadCustomEmojis(sources: readonly CustomEmojiSource[], signal: AbortSignal): Promise<CustomEmojis> {
  const settled = await Promise.allSettled(sources.map((source) => (typeof source === "string" ? fetchPack(source) : typeof source === "function" ? source({ signal }) : listOf(source))));
  return merge(settled.map((r) => (r.status === "fulfilled" ? r.value : r.reason instanceof Error ? r.reason : new Error(String(r.reason)))));
}

export function customRecords(customs: readonly CustomEmoji[], firstOrder: number, base: (unified: string) => EmojiRecord | undefined): EmojiRecord[] {
  const tokenize = tokenizerFor();
  return customs.map((c, i) => {
    const shortcodes = c.shortcodes ?? [];
    const words = new Set([...(c.tags ?? []), ...splitWords(c.id), ...shortcodes.flatMap(splitWords)]);
    const from = c.base ? base(c.base) : undefined;
    if (from) for (const word of [...tokenize(from.name), ...from.tags]) words.add(word);
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
      order: firstOrder + i,
      imageUrl: c.imageUrl,
      ...(c.stillUrl ? { stillUrl: c.stillUrl } : {}),
      ...(c.animated ? { animated: true } : {}),
      ...(c.width ? { width: c.width } : {}),
      ...(c.height ? { height: c.height } : {}),
    };
  });
}
