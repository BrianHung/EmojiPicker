import { GROUPS, type EmojiRecord, type SkinToneValue } from "./dataset";
import { createEmojiGrid, moveInGrid, type EmojiGridMove } from "./grid";
import type { EmojiLabels } from "./labels";
import { createSearch } from "./search/query";
import { emitter, memo, same } from "./reactive";
import { categoryList, categorySections, itemFactory, resultSections, type Category, type CategoryOption, type EmojiItem, type EmojiSection } from "./sections";
import type { EmojiSelection, EmojiStore } from "./store";

export type FocusModel = "input" | "grid";
export type SearchResultsMode = "ranked" | "grouped";

export type PickerStateOptions<Icon = unknown> = {
  labels?: EmojiLabels;
  categories?: readonly CategoryOption<Icon>[];
  frequent?: number | false;
  suggested?: readonly string[];
  emojiVersion?: number;
  searchResults?: SearchResultsMode;
  searchLimit?: number;
  query?: string;
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  collapsedCategories?: readonly string[];
  defaultCollapsedCategories?: readonly string[];
  onCollapsedCategoriesChange?: (ids: readonly string[]) => void;
  highlighted?: string | null;
  defaultHighlighted?: string | null;
  onHighlightedChange?: (id: string | null) => void;
  focusModel?: FocusModel;
  disableVariations?: boolean;
  reactions?: readonly string[];
};

export type PickerSnapshot<Icon = unknown> = {
  query: string;
  searching: boolean;
  results: readonly EmojiRecord[];
  pending: boolean;
  categories: readonly Category<Icon>[];
  categorySections: readonly EmojiSection[];
  sections: readonly EmojiSection[];
  collapsed: readonly string[];
  skinTone: SkinToneValue;
  focus: "virtual" | "roving";
  highlighted: string | null;
  hovered: string | null;
  active: EmojiItem | null;
  activeSection: string | null;
  variations: string | null;
  reactions: readonly string[] | undefined;
};

const NO_IDS: readonly string[] = [];
const NO_SECTIONS: readonly EmojiSection[] = [];

export function setCategoryCollapsed(ids: readonly string[], id: string, collapsed = !ids.includes(id)): readonly string[] {
  if (ids.includes(id) === collapsed) return ids;
  return collapsed ? [...ids, id] : ids.filter((x) => x !== id);
}

const findItem = (sections: readonly EmojiSection[], id: string | null) => {
  for (const s of sections) for (const item of s.items) if (item.id === id) return item;
  return null;
};

type Ui = { highlighted: string | null; hovered: string | null; activeSection: string | null; variations: string | null; searchFields: number; mounted: boolean; domFocus: boolean; held: boolean };

export function createPickerState<Icon = unknown>(store: EmojiStore, options: PickerStateOptions<Icon> = {}) {
  let opts = options;
  let ownQuery = options.defaultQuery ?? "";
  let ownCollapsed = options.defaultCollapsedCategories ?? NO_IDS;
  const ui: Ui = { highlighted: options.defaultHighlighted ?? null, hovered: null, activeSection: null, variations: null, searchFields: 0, mounted: false, domFocus: false, held: false };
  let top: { n: number; list: readonly string[] } | null = null;
  let reactions = options.reactions;
  let cached: PickerSnapshot<Icon> | null = null;
  let last: PickerSnapshot<Icon> | null = null;

  const changed = () => {
    cached = null;
    events.emit();
  };
  const events = emitter(() => {
    cached = null;
    if (!ui.held) top = null;
    const offStore = store.subscribe(changed);
    const offFrequents = store.frequents.subscribe(() => !ui.held && ((top = null), changed()));
    return () => {
      offStore();
      offFrequents();
      search.abort();
    };
  });
  const search = createSearch(store, changed);
  const put = <K extends keyof Ui>(key: K, value: Ui[K]) => {
    if (ui[key] === value) return;
    ui[key] = value;
    if (key === "held" && !value) top = null;
    changed();
  };

  const labels = () => opts.labels ?? store.labels();
  const highlighted = () => (opts.highlighted === undefined ? ui.highlighted : opts.highlighted);
  const query = () => opts.query ?? ownQuery;
  const collapsed = () => opts.collapsedCategories ?? ownCollapsed;
  const frequents = () => {
    const n = (opts.frequent ?? 16) || 1;
    if (!top || (!ui.held && top.n !== n)) top = { n, list: store.frequents.top(n) };
    return top.list;
  };
  const items = memo(itemFactory);
  const categoriesOf = memo((_status: string, categories: readonly CategoryOption<Icon>[] | undefined, labels: EmojiLabels) =>
    categoryList(
      categories,
      store.status() === "ready" ? store.groupNames() : [],
      labels,
      [...store.customGroups().values()].filter((g): g is string => !!g),
    ),
  );
  const suggestedOf = memo((list: readonly string[], _tone: number) => list.map((u) => store.withSkinTone(u)));
  const sectionsOf = memo((status: string, categories: readonly Category<Icon>[], suggested: readonly string[], collapsed: readonly string[], emojiVersion: number | undefined, _tone: number, item: ReturnType<typeof itemFactory>) =>
    status === "ready"
      ? categorySections({
          categories,
          records: store.records(),
          suggested,
          customGroup: (u) => store.customGroups().get(u),
          collapsed: (id) => collapsed.includes(id),
          emojiVersion,
          get: store.get,
          withSkinTone: (u) => store.withSkinTone(u),
          item,
        })
      : NO_SECTIONS,
  );
  const resultsOf = memo((results: readonly EmojiRecord[], emojiVersion: number | undefined) => (emojiVersion == null ? results : results.filter((r) => r.imageUrl || r.version <= emojiVersion)));
  const resultSectionsOf = memo((results: readonly EmojiRecord[], mode: SearchResultsMode, categories: readonly Category<Icon>[], labels: EmojiLabels, _tone: number, item: ReturnType<typeof itemFactory>) => {
    const groupNames = store.status() === "ready" ? store.groupNames() : [];
    const name = (group: string) => categories.find((c) => c.id === group)?.name ?? (group === "custom" ? labels.custom : (groupNames[GROUPS.indexOf(group as (typeof GROUPS)[number])] ?? group));
    return resultSections(results, mode, name, (u) => store.withSkinTone(u), item, labels.searchResults);
  });
  const activeOf = memo(findItem);

  function getSnapshot(): PickerSnapshot<Icon> {
    if (cached) return cached;
    const status = store.status();
    const tone = store.skinTone();
    const l = labels();
    const item = items(l);
    const q = query();
    const searching = q.trim().length > 0;
    const raw = search.run(q, opts.searchLimit ?? 200);
    const results = resultsOf(raw.results, opts.emojiVersion);
    const categories = categoriesOf(status, opts.categories, l);
    const suggested = suggestedOf(opts.suggested ?? (opts.frequent === false ? NO_IDS : frequents()), tone);
    const categorySections = sectionsOf(status, categories, suggested, collapsed(), opts.emojiVersion, tone, item);
    const sections = searching ? resultSectionsOf(results, opts.searchResults ?? "ranked", categories, l, tone, item) : categorySections;
    const { hovered, searchFields, mounted, domFocus } = ui;
    const virtual = (opts.focusModel ?? "input") === "input" && (searchFields > 0 || !mounted) && !domFocus;
    return (cached = last =
      same(last, {
        query: q,
        searching,
        results,
        pending: raw.pending,
        categories,
        categorySections,
        sections,
        collapsed: collapsed(),
        skinTone: tone,
        focus: virtual ? "virtual" : "roving",
        highlighted: highlighted(),
        hovered,
        active: activeOf(sections, hovered ?? highlighted()),
        activeSection: ui.activeSection,
        variations: ui.variations,
        reactions: ui.held ? reactions : (reactions = opts.reactions),
      }));
  }

  let nextCollapsed: readonly string[] | null = null;
  const setCollapsed = (id: string, value?: boolean) => {
    const current = nextCollapsed ?? collapsed();
    const ids = setCategoryCollapsed(current, id, value);
    if (ids === current) return;
    if (opts.collapsedCategories === undefined) ownCollapsed = ids;
    else nextCollapsed = ids;
    changed();
    opts.onCollapsedCategoriesChange?.(ids);
  };

  const state = {
    getSnapshot,
    subscribe: events.subscribe,
    setOptions(next: PickerStateOptions<Icon>, { notify = false } = {}) {
      opts = next;
      nextCollapsed = null;
      if (notify) changed();
      else cached = null;
    },
    setQuery(value: string) {
      if (opts.query === undefined) ownQuery = value;
      changed();
      opts.onQueryChange?.(value);
    },
    toggleCollapsed: (id: string) => setCollapsed(id),
    setCollapsed: (id: string, value: boolean) => setCollapsed(id, value),
    highlight(id: string | null) {
      if (id === highlighted()) return;
      if (opts.highlighted === undefined) put("highlighted", id);
      opts.onHighlightedChange?.(id);
    },
    hover: (id: string | null) => put("hovered", id),
    setActiveSection: (id: string | null) => put("activeSection", id),
    setSkinTone: (tone: SkinToneValue) => store.setSkinTone(tone),
    choose: (id = highlighted()): EmojiSelection | undefined => (id == null ? undefined : store.select(findItem(getSnapshot().sections, id)?.unified ?? id)),
    openVariations(id: string | null) {
      const record = findItem(getSnapshot().sections, id)?.record;
      if (!record?.tones.length || record.imageUrl || opts.disableVariations) return false;
      put("variations", id);
      return true;
    },
    closeVariations: () => put("variations", null),
    registerSearch() {
      put("searchFields", ui.searchFields + 1);
      return () => put("searchFields", ui.searchFields - 1);
    },
    mount: () => put("mounted", true),
    setDomFocus: (value: boolean) => put("domFocus", value),
    hold: (value: boolean) => put("held", value),
  };
  return state;
}

export type PickerState<Icon = unknown> = ReturnType<typeof createPickerState<Icon>>;

export function moveHighlight(state: PickerState, direction: EmojiGridMove, { columns = 9, pageRows = 1 }: { columns?: number; pageRows?: number } = {}): string | null {
  const { sections, highlighted } = state.getSnapshot();
  const grid = createEmojiGrid(sections, { columns, rowHeight: 1 });
  const from = grid.indexOf(highlighted ?? "");
  const to = from < 0 ? (direction === "last" ? grid.count - 1 : 0) : moveInGrid(grid, from, direction, pageRows);
  const id = to == null ? null : (grid.at(to)?.id ?? null);
  if (id != null) state.highlight(id);
  return id;
}
