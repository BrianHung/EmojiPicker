// Custom emoji: their shape, where they come from (inline, a URL, a loader), and
// how they become records the picker and search treat like any other emoji.
import type { EmojiRecord } from "./dataset";
import { tokenize } from "./search-index";

export type CustomEmoji = {
  id: string;
  name: string;
  imageUrl: string;
  shortcodes?: string[];
  tags?: string[];
  /** Customs sharing a group render as their own section. */
  group?: string;
  /** Intrinsic size in px; default square. Non-square images are fitted inside the cell. */
  width?: number;
  height?: number;
  /** `imageUrl` animates (GIF, APNG, WebP). Grids show `stillUrl` until the emoji is hovered or highlighted. */
  animated?: boolean;
  /** A still frame of an animated emoji. Without one, grids show `imageUrl` (animating). */
  stillUrl?: string;
  /** A standard emoji (unified code) whose name and tags this one also matches: a bread frog with base "1f35e" is found by "bread". */
  base?: string;
};

export type CustomEmojiLoader = (options: { signal: AbortSignal }) => Promise<readonly CustomEmoji[]>;

/** Custom emoji inline, or a pack to load: a JSON URL (an array of CustomEmoji) or a loader. */
export type CustomEmojiSource = CustomEmoji | readonly CustomEmoji[] | string | CustomEmojiLoader;

/** "sleepyFrogFamily", "sleepy_frog-family", "HTTPError" → words, lowercased. */
export function splitWords(text: string): string[] {
  return text
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

// Packs from the same URL share one request and one parse, across stores.
const byUrl = new Map<string, Promise<readonly CustomEmoji[]>>();

function fetchPack(url: string): Promise<readonly CustomEmoji[]> {
  let pending = byUrl.get(url);
  if (!pending) {
    pending = fetch(url, { priority: "low" } as RequestInit).then((response) => {
      if (!response.ok) throw new Error(`custom emoji ${url}: ${response.status} ${response.statusText}`);
      return response.json() as Promise<readonly CustomEmoji[]>;
    });
    pending.catch(() => byUrl.delete(url)); // a later load retries
    byUrl.set(url, pending);
  }
  return pending;
}

const isSourceList = (value: CustomEmojiSource | readonly CustomEmojiSource[]): value is readonly CustomEmojiSource[] => Array.isArray(value);

/** Flattens `customEmojis` into sources: one CustomEmoji, an array of them, a URL or a loader each. */
export function customSources(value: CustomEmojiSource | readonly CustomEmojiSource[] | undefined): CustomEmojiSource[] {
  if (value == null) return [];
  return isSourceList(value) ? [...value] : [value];
}

/**
 * Loads every source in parallel. A pack that fails is left out (its error is
 * returned) so one bad URL doesn't take the picker down. Ids repeat at most once:
 * the first wins.
 */
export async function loadCustomEmojis(sources: readonly CustomEmojiSource[], signal: AbortSignal): Promise<{ emojis: CustomEmoji[]; errors: Error[] }> {
  const settled = await Promise.allSettled(
    sources.map((source): Promise<readonly CustomEmoji[]> | readonly CustomEmoji[] => {
      if (typeof source === "string") return fetchPack(source);
      if (typeof source === "function") return source({ signal });
      return Array.isArray(source) ? (source as readonly CustomEmoji[]) : [source as CustomEmoji];
    }),
  );
  const seen = new Set<string>();
  const emojis: CustomEmoji[] = [];
  const errors: Error[] = [];
  for (const result of settled) {
    if (result.status === "rejected") {
      errors.push(result.reason instanceof Error ? result.reason : new Error(String(result.reason)));
      continue;
    }
    for (const emoji of result.value) {
      if (seen.has(emoji.id)) continue;
      seen.add(emoji.id);
      emojis.push(emoji);
    }
  }
  return { emojis, errors };
}

/**
 * Records for custom emoji. Their tags gain the words of their id and shortcodes
 * (so `sleepyFrogFamily` matches "frog family") and their base emoji's name and tags.
 */
export function customRecords(customs: readonly CustomEmoji[], firstOrder: number, base: (unified: string) => EmojiRecord | undefined): EmojiRecord[] {
  return customs.map((c, i) => {
    const shortcodes = c.shortcodes ?? [];
    const words = new Set([...(c.tags ?? []), ...splitWords(c.id), ...shortcodes.flatMap(splitWords)]);
    const from = c.base ? base(c.base) : undefined;
    if (from) for (const word of [...tokenize(from.name), ...from.tags]) words.add(word);
    for (const word of tokenize(c.name)) words.delete(word); // already matched as a name word
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
