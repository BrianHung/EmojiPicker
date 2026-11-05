export const GROUPS = ["smileys_people", "animals_nature", "food_drink", "travel_places", "activities", "objects", "symbols", "flags"] as const;

export type Group = (typeof GROUPS)[number];

export type DatasetEmoji = [string, string, string[], string[], number, number, 0 | 1];

export type Dataset = {
  format: 1;
  locale: string;
  emojibase: string;
  groups: string[];
  emojis: DatasetEmoji[];
  toneExceptions: Record<string, string[]>;
};

export const SKIN_TONES = ["1f3fb", "1f3fc", "1f3fd", "1f3fe", "1f3ff"] as const;

export type SkinToneValue = 0 | 1 | 2 | 3 | 4 | 5;

const TONE_CODES = new Set<string>(SKIN_TONES);

export const withoutTone = (unified: string) =>
  unified
    .split("-")
    .filter((part) => !TONE_CODES.has(part))
    .join("-");

export function withTone(unified: string, tone: number): string {
  const [first, ...rest] = unified.split("-");
  if (rest[0] === "fe0f") rest.shift();
  return [first, SKIN_TONES[tone - 1], ...rest].join("-");
}

export type EmojiRecord = {
  unified: string;
  emoji: string;
  name: string;
  tags: readonly string[];
  shortcodes: readonly string[];
  group: Group | "custom";
  version: number;
  tones: readonly string[];
  order: number;
  imageUrl?: string;
  stillUrl?: string;
  animated?: boolean;
  width?: number;
  height?: number;
};

const UNIFIED = /^[0-9a-f]{2,6}(?:-[0-9a-f]{2,6})*$/i;

export const isUnified = (value: string) => UNIFIED.test(value);

export const unifiedToNative = (unified: string) => (isUnified(unified) ? String.fromCodePoint(...unified.split("-").map((hex) => parseInt(hex, 16))) : "");

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
