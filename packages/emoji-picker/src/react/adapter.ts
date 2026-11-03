// Internal: the only module that knows emoji-picker-react's data and prop shapes.
import type { CategoryConfig, CustomEmoji as EprCustomEmoji, EmojiData as EprEmojiData } from "emoji-picker-react/primitives";
import { Categories, SkinTones } from "emoji-picker-react/primitives";
import { GROUPS, SKIN_TONES, type EmojiRecord } from "../core/dataset";

type EprDataEmoji = EprEmojiData["emojis"][string][number];

/** Shortcodes and tags, then the name last, where epr reads it. */
const eprNames = (r: EmojiRecord) => [...new Set([...r.shortcodes, ...r.tags, r.name])].filter((n) => n !== r.name).concat(r.name);

/** Our records → epr EmojiData. Shortcodes go into `n` so the engine's own search matches `thumbsup`. */
export function toEprData(records: readonly EmojiRecord[], groupNames: readonly string[], labels: { suggested: string; custom: string }): EprEmojiData {
  const emojis: Record<string, EprDataEmoji[]> = Object.fromEntries(GROUPS.map((g) => [g, []]));
  for (const r of records) {
    if (r.group === "custom") continue;
    emojis[r.group]!.push({ n: eprNames(r), u: r.unified, ...(r.tones.length ? { v: [...r.tones] } : {}), a: String(r.version) });
  }
  const categories: Partial<Record<Categories, CategoryConfig>> = {
    [Categories.SUGGESTED]: { category: Categories.SUGGESTED, name: labels.suggested },
    [Categories.CUSTOM]: { category: Categories.CUSTOM, name: labels.custom },
  };
  GROUPS.forEach((g, i) => {
    categories[g as Categories] = { category: g as Categories, name: groupNames[i] ?? g };
  });
  return { categories, emojis };
}

export function toEprCustomEmojis(records: readonly EmojiRecord[], groups: ReadonlyMap<string, string | undefined>): EprCustomEmoji[] {
  return records
    .filter((r) => r.group === "custom")
    .map((r) => ({
      id: r.unified,
      names: eprNames(r),
      // The still frame: the cell swaps in the animation while it's active.
      imgUrl: r.stillUrl ?? r.imageUrl!,
      ...(groups.get(r.unified) ? { group: groups.get(r.unified) } : {}),
    }));
}

/** Our 0-5 ↔ epr SkinTones. */
export const toEprTone = (tone: number): SkinTones => (tone ? (SKIN_TONES[tone - 1] as unknown as SkinTones) : SkinTones.NEUTRAL);
export const fromEprTone = (tone: SkinTones | string): number => SKIN_TONES.indexOf(tone as (typeof SKIN_TONES)[number]) + 1;

export type CategoryOption = {
  /** A built-in group ("smileys_people", ...), "suggested", "custom", or "custom:<group>". */
  id: string;
  name?: string;
  /** Tab icon in CategoryNav. */
  icon?: React.ReactNode;
  /** false: keep the section in the list but give it no tab (Slack's pinned row). */
  nav?: boolean;
};

export function toEprCategories(options: readonly CategoryOption[]) {
  const categories = options.map((o) => {
    if (o.id.startsWith("custom:")) return { category: Categories.CUSTOM, name: o.name ?? o.id.slice(7), group: o.id.slice(7) };
    return o.name ? { category: o.id as Categories, name: o.name } : (o.id as Categories);
  });
  const categoryIcons = Object.fromEntries(options.filter((o) => o.icon && !o.id.startsWith("custom:")).map((o) => [o.id, o.icon]));
  return { categories, categoryIcons };
}
