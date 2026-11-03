/** Picker categories, in display order. Keys match emoji-picker-react's categories. */
export const GROUPS = [
  "smileys_people",
  "animals_nature",
  "food_drink",
  "travel_places",
  "activities",
  "objects",
  "symbols",
  "flags",
] as const;

export type Group = (typeof GROUPS)[number];

/** [unified, label, tags, shortcodes, group index, emoji version, has skin tones (0 | 1)] */
export type DatasetEmoji = [string, string, string[], string[], number, number, 0 | 1];

/** The file produced by scripts/build-data.ts (data/<locale>.json). */
export type Dataset = {
  format: 1;
  locale: string;
  emojibase: string;
  /** Localized group names, indexed like GROUPS. */
  groups: string[];
  emojis: DatasetEmoji[];
  /** Tone variations that don't follow `withTone()`, keyed by unified. */
  toneExceptions: Record<string, string[]>;
};

export const SKIN_TONES = ["1f3fb", "1f3fc", "1f3fd", "1f3fe", "1f3ff"] as const;

/**
 * Applies skin tone 1-5 to a unified code: drop the FE0F that follows the
 * first codepoint and insert the modifier after it.
 * 1f44d → 1f44d-1f3fb, 26f9-fe0f-200d-2642-fe0f → 26f9-1f3fb-200d-2642-fe0f
 */
export function withTone(unified: string, tone: number): string {
  const [first, ...rest] = unified.split("-");
  if (rest[0] === "fe0f") rest.shift();
  return [first, SKIN_TONES[tone - 1], ...rest].join("-");
}

/** The record of one emoji, as the rest of the library sees it. */
export type EmojiRecord = {
  unified: string;
  emoji: string;
  name: string;
  tags: readonly string[];
  shortcodes: readonly string[];
  group: Group | "custom";
  version: number;
  /** Variations for tones 1-5, empty when the emoji has none. */
  tones: readonly string[];
  order: number;
  imageUrl?: string;
};

const UNIFIED = /^[0-9a-f]{2,6}(?:-[0-9a-f]{2,6})*$/i;

/** True for a code point sequence like "1f44d-1f3fd" (false for custom emoji ids). */
export const isUnified = (value: string) => UNIFIED.test(value);

/** "1f44d" → "👍"; "" for anything that isn't a code point sequence (e.g. a custom emoji id). */
export const unifiedToNative = (unified: string) =>
  isUnified(unified) ? String.fromCodePoint(...unified.split("-").map((hex) => parseInt(hex, 16))) : "";

export function expandDataset(dataset: Dataset): EmojiRecord[] {
  return dataset.emojis.map(([unified, name, tags, shortcodes, group, version, hasTones], order) => ({
    unified,
    emoji: unifiedToNative(unified),
    name,
    tags,
    shortcodes,
    group: GROUPS[group] ?? "symbols",
    version,
    tones: dataset.toneExceptions[unified] ?? (hasTones ? [1, 2, 3, 4, 5].map((t) => withTone(unified, t)) : []),
    order,
  }));
}
