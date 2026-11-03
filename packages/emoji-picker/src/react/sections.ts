// The picker's collection: category sections (and search results) as plain objects
// for React Aria. Items are cached so the same emoji in the same section and tone is
// the same object across renders: React Aria rebuilds its collection when `items`
// change, but reuses every node whose value is unchanged.
import { GROUPS, type EmojiRecord } from "../core/dataset";
import type { EmojiLabels } from "../core/labels";
import { nameWithTone } from "../core/shortcodes";

export type CategoryOption = {
  /** A built-in group ("smileys_people", ...), "suggested", "custom", or "custom:<group>". */
  id: string;
  name?: string;
  /** Tab icon in CategoryNav. */
  icon?: React.ReactNode;
  /** false: keep the section in the list but give it no tab (Slack's pinned row). */
  nav?: boolean;
};

export type EmojiItem = {
  /** Unique across sections: the same emoji can be in "Frequently used" and its group. */
  id: string;
  section: string;
  record: EmojiRecord;
  /** What the cell shows and picks: skin tone applied where the emoji has one. */
  unified: string;
  /** Accessible name, with the skin tone ("thumbs up: medium skin tone"). */
  label: string;
};

export type EmojiSection = {
  id: string;
  /** The category it shows ("smileys_people"; grouped results keep their group's). */
  category: string;
  name: string;
  items: readonly EmojiItem[];
  /** Ranked search results have no title. */
  header: boolean;
  collapsed: boolean;
};

export type Category = { id: string; name: string; icon?: React.ReactNode; nav: boolean };

export const DEFAULT_ORDER = ["suggested", "custom", ...GROUPS] as const;
const RESULT_ORDER = [...GROUPS, "custom"] as string[];

/** Sections in order with names: `categories`, or every group, then custom groups no option lists. */
export function categoryList(options: readonly CategoryOption[] | undefined, groupNames: readonly string[], labels: EmojiLabels, customGroups: Iterable<string>): Category[] {
  const name = (id: string) => (id === "suggested" ? labels.suggested : id === "custom" ? labels.custom : id.startsWith("custom:") ? id.slice(7) : (groupNames[GROUPS.indexOf(id as (typeof GROUPS)[number])] ?? id));
  const listed: Category[] = (options?.length ? options : DEFAULT_ORDER.map((id) => ({ id }) as CategoryOption)).map((o) => ({ id: o.id, name: o.name ?? name(o.id), icon: o.icon, nav: o.nav !== false }));
  const customInPlay = !options?.length || options.some((o) => o.id === "custom");
  const ids = new Set(listed.map((c) => c.id));
  const appended = customInPlay ? [...new Set(customGroups)].filter((g) => !ids.has(`custom:${g}`)).map((g): Category => ({ id: `custom:${g}`, name: g, nav: true })) : [];
  return [...listed, ...appended];
}

type ItemCache = Map<string, EmojiItem>;
const caches = new WeakMap<object, ItemCache>();

/** Stable item objects per (labels, section, emoji in its tone). */
export function itemFactory(labels: EmojiLabels) {
  let cache = caches.get(labels);
  if (!cache) caches.set(labels, (cache = new Map()));
  return (section: string, record: EmojiRecord, unified: string): EmojiItem => {
    const id = `${section}:${unified}`;
    let item = cache.get(id);
    if (!item || item.record !== record) {
      item = { id, section, record, unified, label: nameWithTone(record.name, unified, labels.withSkinTone) };
      cache.set(id, item);
    }
    return item;
  };
}

export type CategorySectionsInput = {
  categories: readonly Category[];
  records: readonly EmojiRecord[];
  /** The suggested section's emoji (unified codes, skin tone applied). */
  suggested: readonly string[];
  customGroup: (unified: string) => string | undefined;
  collapsed: (id: string) => boolean;
  emojiVersion?: number;
  get: (unified: string) => EmojiRecord | undefined;
  withSkinTone: (unified: string) => string;
  item: ReturnType<typeof itemFactory>;
};

/** The category list: empty sections are left out; a collapsed one keeps its title and no emoji. */
export function categorySections({ categories, records, suggested, customGroup, collapsed, emojiVersion, get, withSkinTone, item }: CategorySectionsInput): EmojiSection[] {
  const byGroup = new Map<string, EmojiRecord[]>();
  for (const r of records) {
    if (emojiVersion != null && !r.imageUrl && r.version > emojiVersion) continue;
    const group = r.group === "custom" ? customGroup(r.unified) : undefined;
    const key = r.group === "custom" ? (group ? `custom:${group}` : "custom") : r.group;
    let list = byGroup.get(key);
    if (!list) byGroup.set(key, (list = []));
    list.push(r);
  }
  const out: EmojiSection[] = [];
  for (const { id, name } of categories) {
    let items: EmojiItem[];
    if (id === "suggested") {
      items = [];
      for (const unified of suggested) {
        const record = get(unified);
        if (record && (emojiVersion == null || record.imageUrl || record.version <= emojiVersion)) items.push(item(id, record, unified));
      }
    } else items = (byGroup.get(id) ?? []).map((r) => item(id, r, r.imageUrl ? r.unified : withSkinTone(r.unified)));
    if (!items.length) continue;
    const isCollapsed = collapsed(id);
    out.push({ id, category: id, name, items: isCollapsed ? [] : items, header: true, collapsed: isCollapsed });
  }
  return out;
}

/** Search results: one untitled section (ranked) or one per category in category order (grouped). */
export function resultSections(results: readonly EmojiRecord[], mode: "ranked" | "grouped", name: (group: string) => string, withSkinTone: (unified: string) => string, item: ReturnType<typeof itemFactory>, label: string): EmojiSection[] {
  const toItem = (section: string, r: EmojiRecord) => item(section, r, r.imageUrl ? r.unified : withSkinTone(r.unified));
  if (mode === "ranked") return results.length ? [{ id: "results", category: "results", name: label, items: results.map((r) => toItem("results", r)), header: false, collapsed: false }] : [];
  const groups = new Map<string, EmojiRecord[]>();
  for (const r of results) {
    let list = groups.get(r.group);
    if (!list) groups.set(r.group, (list = []));
    list.push(r);
  }
  return [...groups.keys()]
    .sort((a, b) => RESULT_ORDER.indexOf(a) - RESULT_ORDER.indexOf(b))
    .map((group) => ({ id: `results:${group}`, category: group, name: name(group), items: groups.get(group)!.map((r) => toItem(`results:${group}`, r)), header: true, collapsed: false }));
}
