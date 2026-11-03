/**
 * Builds data/<locale>.json from emojibase-data + iamcal (Slack) shortcodes.
 *
 * Skin-tone variations are not stored: `withTone()` computes them, and this
 * script verifies the rule against emojibase, keeping only the exceptions.
 */
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { gzipSync } from "node:zlib";
import { GROUPS, withTone, type Dataset, type DatasetEmoji } from "../src/core/dataset";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const locale = process.argv[2] ?? "en";

type Skin = { hexcode: string; emoji: string; tone?: number | number[] };
type Record_ = {
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

const records: Record_[] = require(`emojibase-data/${locale}/data.json`);
const messages: { groups: { key: string; message: string; order: number }[] } = require(`emojibase-data/${locale}/messages.json`);
const iamcal: Record<string, string | string[]> = require(`emojibase-data/${locale}/shortcodes/iamcal.json`);
const { version: emojibaseVersion } = require("emojibase-data/package.json");

// emojibase group index → our group (smileys + people merge, components are dropped)
const GROUP_OF: Record<number, number> = { 0: 0, 1: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7 };

const stripFE0F = (hex: string) => hex.split("-").filter((c) => c !== "FE0F").join("-");
const shortcodesByHex = new Map<string, string[]>();
for (const [hex, codes] of Object.entries(iamcal)) shortcodesByHex.set(stripFE0F(hex), Array.isArray(codes) ? codes : [codes]);

const toArray = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

// emojibase's hexcode can omit FE0F (❤️ is "2764"); the fully qualified `emoji`
// string is what renders as emoji, and what emoji-picker-react and Twemoji key on.
const qualified = (emoji: string) => [...emoji].map((c) => c.codePointAt(0)!.toString(16)).join("-");

let computed = 0;
const exceptions: Record<string, string[]> = {};
const emojis: DatasetEmoji[] = [];

for (const r of [...records].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
  const group = GROUP_OF[r.group ?? -1];
  if (group === undefined) continue;
  const unified = qualified(r.emoji);

  // Single-tone variations only (uniform tone across all people), in tone order 1..5.
  const tones = (r.skins ?? [])
    .filter((s) => toArray(s.tone).length > 0 && new Set(toArray(s.tone)).size === 1)
    .sort((a, b) => toArray(a.tone)[0]! - toArray(b.tone)[0]!)
    .filter((s, i, all) => all.findIndex((x) => toArray(x.tone)[0] === toArray(s.tone)[0]) === i)
    .map((s) => qualified(s.emoji));

  let toneFlag: 0 | 1 = 0;
  if (tones.length === 5) {
    toneFlag = 1;
    const expected = [1, 2, 3, 4, 5].map((t) => withTone(unified, t));
    if (expected.every((e, i) => e === tones[i])) computed++;
    else exceptions[unified] = tones;
  } else if (tones.length > 0) {
    exceptions[unified] = tones;
  }

  const tags = toArray(r.tags).map((t) => t.toLowerCase());
  const emoticons = toArray(r.emoticon);
  emojis.push([
    unified,
    r.label.toLowerCase(),
    [...new Set([...tags, ...emoticons])],
    shortcodesByHex.get(stripFE0F(r.hexcode)) ?? [],
    group,
    r.version,
    toneFlag,
  ]);
}

// emojibase's group messages are lowercase ("people & body") and split smileys
// from people, which the picker merges. English gets the names Slack and
// emoji-mart use; other locales get the people group, capitalized.
const EN_GROUP_NAMES: Record<string, string> = {
  smileys_people: "Smileys & People",
  animals_nature: "Animals & Nature",
  food_drink: "Food & Drink",
  travel_places: "Travel & Places",
  activities: "Activities",
  objects: "Objects",
  symbols: "Symbols",
  flags: "Flags",
};
const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase(locale) + s.slice(1);
const groupNames = GROUPS.map((key) => {
  if (locale === "en") return EN_GROUP_NAMES[key] ?? key;
  const source = { smileys_people: "people-body", animals_nature: "animals-nature", food_drink: "food-drink", travel_places: "travel-places", activities: "activities", objects: "objects", symbols: "symbols", flags: "flags" }[key];
  return capitalize(messages.groups.find((g) => g.key === source)?.message ?? key);
});

const dataset: Dataset = { format: 1, locale, emojibase: emojibaseVersion, groups: groupNames, emojis, toneExceptions: exceptions };
const out = path.join(root, "data", `${locale}.json`);
fs.mkdirSync(path.dirname(out), { recursive: true });
const json = JSON.stringify(dataset);
fs.writeFileSync(out, json);

const withShortcodes = emojis.filter((e) => e[3].length).length;
console.log(
  `${out}: ${emojis.length} emoji, ${withShortcodes} with shortcodes, ` +
    `${computed} tone sets computed, ${Object.keys(exceptions).length} exceptions, ` +
    `${(json.length / 1024).toFixed(1)} KB raw / ${(gzipSync(json, { level: 9 }).length / 1024).toFixed(1)} KB gz`,
);
