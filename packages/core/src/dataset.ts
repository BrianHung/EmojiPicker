export const GROUPS = ["smileys-people", "animals-nature", "food-drink", "travel-places", "activities", "objects", "symbols", "flags"] as const;

export type Group = (typeof GROUPS)[number];

export type DatasetEmoji = [unified: string, name: string, tags: string[], shortcodes: string[], group: number, version: number, hasTones: 0 | 1];

export type Dataset = {
  format: 1;
  locale: string;
  emojibase: string;
  groups: string[];
  emojis: DatasetEmoji[];
  toneExceptions: Record<string, string[]>;
};

export type EmojiDataInputEntry = ({ emoji: string; unified?: never } | { unified: string; emoji?: never }) & {
  name: string;
  tags?: readonly string[];
  shortcodes?: readonly string[];
  group: Group;
  version?: number;
};

export type EmojiDataInput = {
  locale: string;
  groups: readonly { id: Group; name: string }[];
  emojis: readonly EmojiDataInputEntry[];
};

export const SKIN_TONES = ["1f3fb", "1f3fc", "1f3fd", "1f3fe", "1f3ff"] as const;

export type SkinToneValue = 0 | 1 | 2 | 3 | 4 | 5;

export const SKIN_TONE_VALUES: readonly SkinToneValue[] = [0, 1, 2, 3, 4, 5];

const TONE_CODES = new Set<string>(SKIN_TONES);

export const withoutTone = (unified: string) =>
  unified
    .toLowerCase()
    .split("-")
    .filter((part) => !TONE_CODES.has(part))
    .join("-");

export const withoutFe0f = (unified: string) => unified.replace(/-fe0f/gi, "");

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

export const nativeToUnified = (text: string) => [...text].map((c) => c.codePointAt(0)!.toString(16)).join("-");

// A prebuilt dataset, not an EmojiDataInput to convert: format 1, with tone exceptions and emojis as tuples
export const isDataset = (value: Dataset | EmojiDataInput): value is Dataset =>
  "format" in value && value.format === 1 && "toneExceptions" in value && Array.isArray(value.groups) && (value.emojis.length === 0 || Array.isArray(value.emojis[0]));

export function toDataset(data: Dataset | EmojiDataInput): Dataset {
  if (isDataset(data)) return data;
  return {
    format: 1,
    locale: data.locale,
    emojibase: "",
    groups: GROUPS.map((id) => data.groups.find((g) => g.id === id)?.name ?? id),
    emojis: data.emojis.map((e) => [e.unified?.toLowerCase() ?? nativeToUnified(e.emoji!), e.name, e.tags ?? [], e.shortcodes ?? [], GROUPS.indexOf(e.group), e.version ?? 0, 0] as DatasetEmoji),
    toneExceptions: {},
  };
}

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
