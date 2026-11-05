import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { GROUPS, withTone, type Dataset, type DatasetEmoji } from "../src/core/dataset";

type Skin = { hexcode: string; emoji: string; tone?: number | number[] };
type EmojibaseEmoji = {
  hexcode: string;
  emoji: string;
  label: string;
  tags?: string[];
  group?: number;
  order?: number;
  version: number;
  emoticon?: string | string[];
  skins?: Skin[];
};
type Messages = { groups: { key: string; message: string }[] };
type ShortcodeSet = Record<string, string | string[]>;
type Load = <T>(file: string) => T;

export type BuildDataOptions = {
  locale: string;
  shortcodes?: readonly string[];
  load?: Load;
};

export type BuildDataResult = {
  dataset: Dataset;
  stats: { emoji: number; withShortcodes: number; computedTones: number; toneExceptions: number };
};

export function findEmojibase(): { root: string; load: Load } | undefined {
  for (const base of [path.join(process.cwd(), "package.json"), import.meta.url]) {
    const require = createRequire(base);
    try {
      const root = path.dirname(require.resolve("emojibase-data/package.json"));
      return { root, load: (file) => require(`emojibase-data/${file}`) };
    } catch {}
  }
  return undefined;
}

export const emojibaseLocales = (root: string) =>
  fs
    .readdirSync(root)
    .filter((name) => fs.existsSync(path.join(root, name, "data.json")))
    .sort();

const isEnglish = (locale: string) => locale.split("-")[0] === "en";

export const defaultShortcodeSets = (locale: string) => (isEnglish(locale) ? ["iamcal"] : ["iamcal", "cldr"]);

const GROUP_OF: Record<number, number> = { 0: 0, 1: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7 };
const MESSAGE_KEY: Record<(typeof GROUPS)[number], string> = {
  smileys_people: "people-body",
  animals_nature: "animals-nature",
  food_drink: "food-drink",
  travel_places: "travel-places",
  activities: "activities",
  objects: "objects",
  symbols: "symbols",
  flags: "flags",
};
const ENGLISH_GROUPS = ["Smileys & People", "Animals & Nature", "Food & Drink", "Travel & Places", "Activities", "Objects", "Symbols", "Flags"];

const toArray = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const stripFE0F = (hex: string) =>
  hex
    .toLowerCase()
    .split("-")
    .filter((c) => c !== "fe0f")
    .join("-");
// emojibase's hexcode can omit FE0F (❤️ is 2764); the fully qualified emoji is what renders and what Twemoji keys on
const qualified = (emoji: string) => [...emoji].map((c) => c.codePointAt(0)!.toString(16)).join("-");

function loadShortcodes(load: Load, locale: string, sets: readonly string[]): Map<string, string[]> {
  const byHex = new Map<string, string[]>();
  for (const set of sets) {
    const codes = tryLoad<ShortcodeSet>(load, `${locale}/shortcodes/${set}.json`) ?? tryLoad<ShortcodeSet>(load, `en/shortcodes/${set}.json`);
    if (!codes) throw new Error(`emojibase-data has no "${set}" shortcodes`);
    for (const [hex, value] of Object.entries(codes)) {
      const key = stripFE0F(hex);
      byHex.set(key, [...new Set([...(byHex.get(key) ?? []), ...toArray(value)])]);
    }
  }
  return byHex;
}

function tryLoad<T>(load: Load, file: string): T | undefined {
  try {
    return load<T>(file);
  } catch {
    return undefined;
  }
}

export function buildDataset({ locale, shortcodes: sets = defaultShortcodeSets(locale), load = findEmojibase()?.load }: BuildDataOptions): BuildDataResult {
  if (!load) throw new Error("emojibase-data is not installed");
  const records = tryLoad<EmojibaseEmoji[]>(load, `${locale}/data.json`);
  if (!records) throw new Error(`emojibase-data has no locale "${locale}"`);
  const messages = load<Messages>(`${locale}/messages.json`);
  const { version } = load<{ version: string }>("package.json");
  const shortcodesByHex = loadShortcodes(load, locale, sets);
  const lower = (s: string) => s.toLocaleLowerCase(locale);

  let computedTones = 0;
  const toneExceptions: Record<string, string[]> = {};
  const emojis: DatasetEmoji[] = [];

  for (const r of [...records].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
    const group = GROUP_OF[r.group ?? -1];
    if (group === undefined) continue;
    const unified = qualified(r.emoji);

    const tones = (r.skins ?? [])
      .filter((s) => toArray(s.tone).length > 0 && new Set(toArray(s.tone)).size === 1)
      .sort((a, b) => toArray(a.tone)[0]! - toArray(b.tone)[0]!)
      .filter((s, i, all) => all.findIndex((x) => toArray(x.tone)[0] === toArray(s.tone)[0]) === i)
      .map((s) => qualified(s.emoji));

    let hasTones: 0 | 1 = 0;
    if (tones.length === 5) {
      hasTones = 1;
      if (tones.every((t, i) => t === withTone(unified, i + 1))) computedTones++;
      else toneExceptions[unified] = tones;
    } else if (tones.length > 0) {
      toneExceptions[unified] = tones;
    }

    const tags = [...toArray(r.tags).map(lower), ...toArray(r.emoticon)];
    emojis.push([unified, lower(r.label), [...new Set(tags)], shortcodesByHex.get(stripFE0F(r.hexcode)) ?? [], group, r.version, hasTones]);
  }

  const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase(locale) + s.slice(1);
  const groups = isEnglish(locale) ? ENGLISH_GROUPS : GROUPS.map((key) => capitalize(messages.groups.find((g) => g.key === MESSAGE_KEY[key])?.message ?? key));

  return {
    dataset: { format: 1, locale, emojibase: version, groups, emojis, toneExceptions },
    stats: { emoji: emojis.length, withShortcodes: emojis.filter((e) => e[3].length).length, computedTones, toneExceptions: Object.keys(toneExceptions).length },
  };
}
