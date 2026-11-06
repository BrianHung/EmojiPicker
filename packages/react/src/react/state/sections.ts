import { GROUPS, nameWithTone, type EmojiLabels, type EmojiRecord, type Group } from "@brianhung/emoji-picker-core";
import { cached } from "./reactive";

export type CategoryId = Group | "suggested" | "custom" | `custom:${string}`;

export type CategoryOption<Icon = unknown> = {
  id: CategoryId;
  name?: string;
  icon?: Icon;
  nav?: boolean;
};

const NO_NODES: readonly never[] = [];

export type EmojiItem = {
  readonly id: string;
  readonly section: string;
  readonly record: EmojiRecord;
  readonly unified: string;
  readonly label: string;
};

// Also a React Aria collection node, so the list's collection holds the items themselves
class Item implements EmojiItem {
  constructor(
    readonly id: string,
    readonly section: string,
    readonly record: EmojiRecord,
    readonly unified: string,
    readonly label: string,
  ) {}
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
  category: string;
  name: string;
  items: readonly EmojiItem[];
  header: boolean;
  collapsed: boolean;
};

export type Category<Icon = unknown> = { id: string; name: string; icon?: Icon; nav: boolean };

const DEFAULT_ORDER = ["suggested", "custom", ...GROUPS] as const;
const RESULT_ORDER = [...GROUPS, "custom"] as string[];

export function categoryList<Icon>(options: readonly CategoryOption<Icon>[] | undefined, groupNames: readonly string[], labels: EmojiLabels, customGroups: Iterable<string>): Category<Icon>[] {
  const name = (id: string) => (id === "suggested" ? labels.suggested : id === "custom" ? labels.custom : id.startsWith("custom:") ? id.slice(7) : (groupNames[GROUPS.indexOf(id as (typeof GROUPS)[number])] ?? id));
  const listed: Category<Icon>[] = (options?.length ? options : DEFAULT_ORDER.map((id) => ({ id }) as CategoryOption<Icon>)).map((o) => ({ id: o.id, name: o.name ?? name(o.id), icon: o.icon, nav: o.nav !== false }));
  const ids = new Set(listed.map((c) => c.id));
  const unlisted = ["custom", ...[...customGroups].map((g) => `custom:${g}`)].filter((id) => !ids.has(id) && ids.add(id));
  return [...listed, ...unlisted.map((id): Category<Icon> => ({ id, name: name(id), nav: true }))];
}

type ItemCache = Map<string, EmojiItem>;
const caches = new WeakMap<object, ItemCache>();

export function itemFactory(labels: EmojiLabels) {
  const cache = cached(caches, labels, (): ItemCache => new Map());
  return (section: string, record: EmojiRecord, unified: string): EmojiItem => {
    const id = `${section}:${unified}`;
    const hit = cache.get(id);
    if (hit?.record === record) return hit;
    const item = new Item(id, section, record, unified, nameWithTone(record.name, unified, labels.withSkinTone));
    cache.set(id, item);
    return item;
  };
}

const groupBy = <T>(values: Iterable<T>, keyOf: (value: T) => string) => {
  const groups = new Map<string, T[]>();
  for (const value of values) cached(groups, keyOf(value), (): T[] => []).push(value);
  return groups;
};

type CategorySectionsInput = {
  categories: readonly Category<unknown>[];
  records: readonly EmojiRecord[];
  suggested: readonly string[];
  customGroup: (unified: string) => string | undefined;
  collapsed: (id: string) => boolean;
  emojiVersion?: number;
  get: (unified: string) => EmojiRecord | undefined;
  withSkinTone: (unified: string) => string;
  item: ReturnType<typeof itemFactory>;
};

export function categorySections({ categories, records, suggested, customGroup, collapsed, emojiVersion, get, withSkinTone, item }: CategorySectionsInput): EmojiSection[] {
  const shown = (r: EmojiRecord) => emojiVersion == null || Boolean(r.imageUrl) || r.version <= emojiVersion;
  const byGroup = groupBy(records.filter(shown), (r) => {
    const group = r.group === "custom" ? customGroup(r.unified) : undefined;
    return r.group === "custom" ? (group ? `custom:${group}` : "custom") : r.group;
  });
  const itemsOf = (id: string): EmojiItem[] =>
    id === "suggested"
      ? suggested.flatMap((unified) => {
          const record = get(unified);
          return record && shown(record) ? [item(id, record, unified)] : [];
        })
      : (byGroup.get(id) ?? []).map((r) => item(id, r, r.imageUrl ? r.unified : withSkinTone(r.unified)));
  return categories.flatMap(({ id, name }) => {
    const items = itemsOf(id);
    if (!items.length) return [];
    const isCollapsed = collapsed(id);
    return [{ id, category: id, name, items: isCollapsed ? [] : items, header: true, collapsed: isCollapsed }];
  });
}

export function resultSections(results: readonly EmojiRecord[], mode: "ranked" | "grouped", name: (group: string) => string, withSkinTone: (unified: string) => string, item: ReturnType<typeof itemFactory>, label: string): EmojiSection[] {
  const toItem = (section: string, r: EmojiRecord) => item(section, r, r.imageUrl ? r.unified : withSkinTone(r.unified));
  if (mode === "ranked") return results.length ? [{ id: "results", category: "results", name: label, items: results.map((r) => toItem("results", r)), header: false, collapsed: false }] : [];
  const groups = groupBy(results, (r) => r.group);
  return [...groups.keys()]
    .sort((a, b) => RESULT_ORDER.indexOf(a) - RESULT_ORDER.indexOf(b))
    .map((group) => ({ id: `results:${group}`, category: group, name: name(group), items: groups.get(group)!.map((r) => toItem(`results:${group}`, r)), header: true, collapsed: false }));
}
