// The picker's sections: category sections (and search results) of items cached per
// labels, section and tone, so the same emoji is one object across renders and pickers.
// An item also has the fields of a collection node, so a renderer can use it as one.
import { GROUPS, type EmojiRecord } from "./dataset";
import type { EmojiLabels } from "./labels";
import { nameWithTone } from "./shortcodes";

export type CategoryOption<Icon = unknown> = {
  /** A built-in group ("smileys_people", ...), "suggested", "custom", or "custom:<group>". */
  id: string;
  name?: string;
  /** Tab icon in CategoryNav. */
  icon?: Icon;
  /** false: keep the section in the list but give it no tab (Slack's pinned row). */
  nav?: boolean;
};

const NO_NODES: readonly never[] = [];

export class EmojiItem {
  constructor(
    /** Unique across sections: the same emoji can be in "Frequently used" and its group. */
    readonly id: string,
    readonly section: string,
    readonly record: EmojiRecord,
    /** What the cell shows and picks: skin tone applied where the emoji has one. */
    readonly unified: string,
    /** Accessible name, with the skin tone ("thumbs up: medium skin tone"). */
    readonly label: string,
  ) {}
  // Node fields, on the prototype: an item costs its five fields.
  get type() {
    return "item" as const;
  }
  get key() {
    return this.id;
  }
  get value() {
    return this;
  }
  get textValue() {
    return this.label;
  }
  get parentKey() {
    return this.section;
  }
  get level() {
    return 1;
  }
  get index() {
    return -1;
  }
  get hasChildNodes() {
    return false;
  }
  get childNodes() {
    return NO_NODES;
  }
  get rendered() {
    return null;
  }
}

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

export type Category<Icon = unknown> = { id: string; name: string; icon?: Icon; nav: boolean };

const DEFAULT_ORDER = ["suggested", "custom", ...GROUPS] as const;
const RESULT_ORDER = [...GROUPS, "custom"] as string[];

/** Sections in order with names: `categories`, or every group, then custom groups no option lists. */
export function categoryList<Icon>(options: readonly CategoryOption<Icon>[] | undefined, groupNames: readonly string[], labels: EmojiLabels, customGroups: Iterable<string>): Category<Icon>[] {
  const name = (id: string) => (id === "suggested" ? labels.suggested : id === "custom" ? labels.custom : id.startsWith("custom:") ? id.slice(7) : (groupNames[GROUPS.indexOf(id as (typeof GROUPS)[number])] ?? id));
  const listed: Category<Icon>[] = (options?.length ? options : DEFAULT_ORDER.map((id) => ({ id }) as CategoryOption<Icon>)).map((o) => ({ id: o.id, name: o.name ?? name(o.id), icon: o.icon, nav: o.nav !== false }));
  const customInPlay = !options?.length || options.some((o) => o.id === "custom");
  const ids = new Set(listed.map((c) => c.id));
  const appended = customInPlay ? [...new Set(customGroups)].filter((g) => !ids.has(`custom:${g}`)).map((g): Category<Icon> => ({ id: `custom:${g}`, name: g, nav: true })) : [];
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
      item = new EmojiItem(id, section, record, unified, nameWithTone(record.name, unified, labels.withSkinTone));
      cache.set(id, item);
    }
    return item;
  };
}

type CategorySectionsInput = {
  categories: readonly Category<unknown>[];
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
