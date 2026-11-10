import { GROUPS, type EmojiRecord, type Group, type SkinToneValue } from "../dataset";
import type { EmojiLabels } from "../labels";
import { cached } from "../reactive";
import { nameWithTone } from "../shortcodes";

export type CategoryId = Group | "frequent" | "custom" | `custom:${string}`;

export interface CategoryOption<Icon = unknown> {
  id: CategoryId;
  name?: string;
  icon?: Icon;
  nav?: boolean;
}

export interface Category<Icon = unknown> {
  id: string;
  name: string;
  icon?: Icon;
  nav: boolean;
}

export interface EmojiItem {
  readonly id: string;
  readonly section: string;
  readonly record: EmojiRecord;
  readonly unified: string;
  readonly label: string;
}

export interface EmojiSection {
  readonly id: string;
  readonly category: string;
  readonly name: string;
  readonly items: readonly EmojiItem[];
  readonly header: boolean;
  readonly collapsed: boolean;
}

export type SearchResultsMode = "ranked" | "grouped";

export type ItemFactory = (section: string, record: EmojiRecord, unified: string) => EmojiItem;

const DEFAULT_ORDER: readonly CategoryId[] = ["frequent", "custom", ...GROUPS];
const RESULT_ORDER: readonly string[] = [...GROUPS, "custom"];

export const groupName = (groupNames: readonly string[], id: string) => groupNames[(GROUPS as readonly string[]).indexOf(id)] ?? id;

export function categoryList<Icon>(options: readonly CategoryOption<Icon>[] | undefined, groupNames: readonly string[], labels: EmojiLabels, customGroups: Iterable<string>): Category<Icon>[] {
  const name = (id: string) => (id === "frequent" ? labels.frequent : id === "custom" ? labels.custom : id.startsWith("custom:") ? id.slice(7) : groupName(groupNames, id));
  const chosen: readonly CategoryOption<Icon>[] = options?.length ? options : DEFAULT_ORDER.map((id) => ({ id }));
  const listed = chosen.map((o): Category<Icon> => ({ id: o.id, name: o.name ?? name(o.id), icon: o.icon, nav: o.nav !== false }));
  const ids = new Set(listed.map((c) => c.id));
  const unlisted = ["custom", ...[...customGroups].map((g) => `custom:${g}`)].filter((id) => !ids.has(id) && ids.add(id));
  return [...listed, ...unlisted.map((id): Category<Icon> => ({ id, name: name(id), nav: true }))];
}

const caches = new WeakMap<EmojiLabels, Map<string, EmojiItem>>();

// Items keep their identity while their record does, so a collection can reuse them across renders
export function itemFactory(labels: EmojiLabels): ItemFactory {
  const cache = cached(caches, labels, () => new Map<string, EmojiItem>());
  return (section, record, unified) => {
    const id = `${section}:${unified}`;
    const hit = cache.get(id);
    if (hit?.record === record) return hit;
    const item: EmojiItem = Object.freeze({ id, section, record, unified, label: nameWithTone(record.name, unified, labels.withSkinTone) });
    cache.set(id, item);
    return item;
  };
}

const groupBy = <T>(values: Iterable<T>, keyOf: (value: T) => string) => {
  const groups = new Map<string, T[]>();
  for (const value of values) cached(groups, keyOf(value), (): T[] => []).push(value);
  return groups;
};

export interface CategorySectionsInput {
  categories: readonly Category<unknown>[];
  records: readonly EmojiRecord[];
  frequent: readonly string[];
  customGroup: (unified: string) => string | undefined;
  collapsed: readonly string[];
  emojiVersion?: number;
  get: (unified: string) => EmojiRecord | undefined;
  tone: SkinToneValue;
  item: ItemFactory;
}

export const toned = (record: EmojiRecord, tone: SkinToneValue, unified = record.unified): string => (tone && record.tones[tone - 1]) || unified;

export const shownIn = (emojiVersion: number | undefined) => (r: EmojiRecord) => emojiVersion == null || Boolean(r.imageUrl) || r.version <= emojiVersion;

export function categorySections({ categories, records, frequent, customGroup, collapsed, emojiVersion, get, tone, item }: CategorySectionsInput): EmojiSection[] {
  const shown = shownIn(emojiVersion);
  const byGroup = groupBy(records.filter(shown), (r) => {
    if (r.group !== "custom") return r.group;
    const group = customGroup(r.unified);
    return group ? `custom:${group}` : "custom";
  });
  const itemsOf = (id: string): EmojiItem[] =>
    id === "frequent"
      ? frequent.flatMap((unified) => {
          const record = get(unified);
          return record && shown(record) ? [item(id, record, toned(record, tone, unified))] : [];
        })
      : (byGroup.get(id) ?? []).map((r) => item(id, r, toned(r, tone)));
  return categories.flatMap(({ id, name }) => {
    const items = itemsOf(id);
    if (!items.length) return [];
    const isCollapsed = collapsed.includes(id);
    return [{ id, category: id, name, items: isCollapsed ? [] : items, header: true, collapsed: isCollapsed }];
  });
}

export function resultSections(results: readonly EmojiRecord[], mode: SearchResultsMode, name: (group: string) => string, tone: SkinToneValue, item: ItemFactory, label: string): EmojiSection[] {
  const toItem = (section: string, r: EmojiRecord) => item(section, r, toned(r, tone));
  if (mode === "ranked") return results.length ? [{ id: "results", category: "results", name: label, items: results.map((r) => toItem("results", r)), header: false, collapsed: false }] : [];
  const groups = groupBy(results, (r) => r.group);
  return [...groups]
    .sort(([a], [b]) => RESULT_ORDER.indexOf(a) - RESULT_ORDER.indexOf(b))
    .map(([group, records]) => ({ id: `results:${group}`, category: group, name: name(group), items: records.map((r) => toItem(`results:${group}`, r)), header: true, collapsed: false }));
}

export function setCategoryCollapsed(ids: readonly string[], id: string, collapsed = !ids.includes(id)): readonly string[] {
  if (ids.includes(id) === collapsed) return ids;
  return collapsed ? [...ids, id] : ids.filter((x) => x !== id);
}

export const findItem = (sections: readonly EmojiSection[], id: string | null | undefined): EmojiItem | null => {
  for (const s of sections) for (const item of s.items) if (item.id === id) return item;
  return null;
};
