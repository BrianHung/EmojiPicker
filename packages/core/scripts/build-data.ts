import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
  GROUP_KEY_ACTIVITIES,
  GROUP_KEY_ANIMALS_NATURE,
  GROUP_KEY_FLAGS,
  GROUP_KEY_FOOD_DRINK,
  GROUP_KEY_OBJECTS,
  GROUP_KEY_PEOPLE_BODY,
  GROUP_KEY_SMILEYS_EMOTION,
  GROUP_KEY_SYMBOLS,
  GROUP_KEY_TRAVEL_PLACES,
  joinShortcodesToEmoji,
  type Emoji,
  type GroupKey,
  type MessagesDataset,
  type ShortcodesDataset,
} from "emojibase";
import { GROUPS, nativeToUnified, withTone, type Dataset, type DatasetEmoji } from "../src/dataset";

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
// Smileys & People merges two emojibase groups, so its name lists both
const MESSAGE_KEY: Record<(typeof GROUPS)[number], GroupKey | GroupKey[]> = {
  "smileys-people": [GROUP_KEY_SMILEYS_EMOTION, GROUP_KEY_PEOPLE_BODY],
  "animals-nature": GROUP_KEY_ANIMALS_NATURE,
  "food-drink": GROUP_KEY_FOOD_DRINK,
  "travel-places": GROUP_KEY_TRAVEL_PLACES,
  activities: GROUP_KEY_ACTIVITIES,
  objects: GROUP_KEY_OBJECTS,
  symbols: GROUP_KEY_SYMBOLS,
  flags: GROUP_KEY_FLAGS,
};
const ENGLISH_GROUPS = ["Smileys & People", "Animals & Nature", "Food & Drink", "Travel & Places", "Activities", "Objects", "Symbols", "Flags"];

const toArray = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

const loadShortcodes = (load: Load, locale: string, sets: readonly string[]) =>
  sets.map((set) => {
    const codes = tryLoad<ShortcodesDataset>(load, `${locale}/shortcodes/${set}.json`) ?? tryLoad<ShortcodesDataset>(load, `en/shortcodes/${set}.json`);
    if (!codes) throw new Error(`emojibase-data has no "${set}" shortcodes`);
    return codes;
  });

function tryLoad<T>(load: Load, file: string): T | undefined {
  try {
    return load<T>(file);
  } catch {
    return undefined;
  }
}

export function buildDataset({ locale, shortcodes: sets = defaultShortcodeSets(locale), load = findEmojibase()?.load }: BuildDataOptions): BuildDataResult {
  if (!load) throw new Error("emojibase-data is not installed");
  const records = tryLoad<Emoji[]>(load, `${locale}/data.json`);
  if (!records) throw new Error(`emojibase-data has no locale "${locale}"`);
  const messages = load<MessagesDataset>(`${locale}/messages.json`);
  const { version } = load<{ version: string }>("package.json");
  const shortcodes = loadShortcodes(load, locale, sets);
  const lower = (s: string) => s.toLocaleLowerCase(locale);

  let computedTones = 0;
  const toneExceptions: Record<string, string[]> = {};
  const emojis: DatasetEmoji[] = [];

  for (const r of [...records].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
    const group = GROUP_OF[r.group ?? -1];
    if (group === undefined) continue;
    const unified = nativeToUnified(r.emoji);

    const tones = (r.skins ?? [])
      .filter((s) => toArray(s.tone).length > 0 && new Set(toArray(s.tone)).size === 1)
      .sort((a, b) => toArray(a.tone)[0]! - toArray(b.tone)[0]!)
      .filter((s, i, all) => all.findIndex((x) => toArray(x.tone)[0] === toArray(s.tone)[0]) === i)
      .map((s) => nativeToUnified(s.emoji));

    let hasTones: 0 | 1 = 0;
    if (tones.length === 5) {
      hasTones = 1;
      if (tones.every((t, i) => t === withTone(unified, i + 1))) computedTones++;
      else toneExceptions[unified] = tones;
    } else if (tones.length > 0) {
      toneExceptions[unified] = tones;
    }

    const tags = [...toArray(r.tags).map(lower), ...toArray(r.emoticon)];
    emojis.push([unified, lower(r.label), [...new Set(tags)], joinShortcodesToEmoji({ ...r, skins: undefined }, shortcodes).shortcodes ?? [], group, r.version, hasTones]);
  }

  const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase(locale) + s.slice(1);
  const message = (key: GroupKey) => messages.groups.find((g) => g.key === key)?.message ?? key;
  const list = new Intl.ListFormat(locale, { type: "conjunction" });
  const groups = isEnglish(locale) ? ENGLISH_GROUPS : GROUPS.map((key) => capitalize(list.format(toArray(MESSAGE_KEY[key]).map(message))));

  return {
    dataset: { format: 1, locale, emojibase: version, groups, emojis, toneExceptions },
    stats: { emoji: emojis.length, withShortcodes: emojis.filter((e) => e[3].length).length, computedTones, toneExceptions: Object.keys(toneExceptions).length },
  };
}
