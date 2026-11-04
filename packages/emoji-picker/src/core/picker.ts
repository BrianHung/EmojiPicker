import { GROUPS, type EmojiRecord } from "./dataset";
import { createEmojiGrid, moveInGrid, type EmojiGridMove } from "./grid";
import type { EmojiLabels } from "./labels";
import { createSearch } from "./query";
import { emitter, memo, same } from "./reactive";
import { categoryList, categorySections, itemFactory, resultSections, type Category, type CategoryOption, type EmojiItem, type EmojiSection } from "./sections";
import type { EmojiSelection, EmojiStore } from "./store";

/** "input": focus stays in the search field and a highlight moves (virtual focus). "grid": focus moves through the cells. */
export type FocusModel = "input" | "grid";
export type SearchResultsMode = "ranked" | "grouped";

export type PickerStateOptions<Icon = unknown> = {
  /** Default: the store's (`store.labels()`). */
  labels?: EmojiLabels;
  /** Which categories show, in order, with optional names and icons. */
  categories?: readonly CategoryOption<Icon>[];
  /** Size of the "Frequently used" section; false hides it. Default 16. */
  frequent?: number | false;
  /** Fixed emoji (unified codes) for the suggested section instead of frequents. */
  suggested?: readonly string[];
  /** Hide emoji newer than this Unicode emoji version. */
  emojiVersion?: number;
  searchResults?: SearchResultsMode;
  /** Most results for a query. Default 200. */
  searchLimit?: number;
  /** Controlled query. */
  search?: string;
  defaultSearch?: string;
  onSearchChange?: (query: string) => void;
  /** Controlled collapsed sections (category ids). */
  collapsedCategories?: readonly string[];
  defaultCollapsedCategories?: readonly string[];
  onCollapsedCategoriesChange?: (ids: string[]) => void;
  focusModel?: FocusModel;
  disableVariations?: boolean;
  /** A tapback's reactions (unified codes), held like frequents while the user is in the picker. */
  reactions?: readonly string[];
};

export type PickerSnapshot<Icon = unknown> = {
  query: string;
  searching: boolean;
  results: readonly EmojiRecord[];
  pending: boolean;
  /** Every category in order, with names and icons (empty ones too). */
  categories: readonly Category<Icon>[];
  /** The categories as shown: empty ones left out, collapsed ones without emoji. */
  categorySections: readonly EmojiSection[];
  /** What the grid shows: the search results while searching, else the categories. */
  sections: readonly EmojiSection[];
  collapsed: readonly string[];
  skinTone: number;
  /** "virtual": the highlight moves while focus stays in the search field (aria-activedescendant). "roving": focus moves through the cells. */
  focus: "virtual" | "roving";
  /** Item ids: the keyboard position, the hovered emoji, and whichever of them the preview shows. */
  highlighted: string | null;
  hovered: string | null;
  active: EmojiItem | null;
  activeSection: string | null;
  /** The emoji whose skin-tone variations are open. */
  variations: string | null;
  reactions: readonly string[] | undefined;
};

const NO_IDS: readonly string[] = [];
const NO_SECTIONS: readonly EmojiSection[] = [];

/** `ids` with `id` added (collapsed) or removed; toggled without `collapsed`. `ids` itself when nothing changes. */
export function setCategoryCollapsed(ids: readonly string[], id: string, collapsed = !ids.includes(id)): readonly string[] {
  if (ids.includes(id) === collapsed) return ids;
  return collapsed ? [...ids, id] : ids.filter((x) => x !== id);
}

const findItem = (sections: readonly EmojiSection[], id: string | null) => {
  for (const s of sections) for (const item of s.items) if (item.id === id) return item;
  return null;
};

type Ui = { highlighted: string | null; hovered: string | null; activeSection: string | null; variations: string | null; searchFields: number; mounted: boolean; domFocus: boolean; held: boolean };

/**
 * An emoji picker's state, for any framework: the query and its results, the sections (categories,
 * frequents, collapse), the highlight and hover, the current section, skin tone and variations.
 * Feed it options (`setOptions` from a render, or actions), render its snapshot.
 */
export function createPickerState<Icon = unknown>(store: EmojiStore, options: PickerStateOptions<Icon> = {}) {
  let opts = options;
  let ownQuery = options.defaultSearch ?? "";
  let ownCollapsed = options.defaultCollapsedCategories ?? NO_IDS;
  const ui: Ui = { highlighted: null, hovered: null, activeSection: null, variations: null, searchFields: 0, mounted: false, domFocus: false, held: false };
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
  const query = () => opts.search ?? ownQuery;
  const collapsed = () => opts.collapsedCategories ?? ownCollapsed;
  // Frequents change with every pick; held while the user is in the picker so nothing moves under them.
  const frequents = () => {
    const n = (opts.frequent ?? 16) || 1;
    if (!top || (!ui.held && top.n !== n)) top = { n, list: store.frequents.top(n) };
    return top.list;
  };
  const items = memo(itemFactory);
  const categoriesOf = memo((_status: string, categories: readonly CategoryOption<Icon>[] | undefined, labels: EmojiLabels) =>
    categoryList(categories, store.status() === "ready" ? store.groupNames() : [], labels, [...store.customGroups().values()].filter((g): g is string => !!g)),
  );
  const suggestedOf = memo((list: readonly string[], _tone: number) => list.map((u) => store.withSkinTone(u)));
  const sectionsOf = memo((status: string, categories: readonly Category<Icon>[], suggested: readonly string[], collapsed: readonly string[], emojiVersion: number | undefined, _tone: number, item: ReturnType<typeof itemFactory>) =>
    status === "ready"
      ? categorySections({ categories, records: store.records(), suggested, customGroup: (u) => store.customGroups().get(u), collapsed: (id) => collapsed.includes(id), emojiVersion, get: store.get, withSkinTone: (u) => store.withSkinTone(u), item })
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
    const { highlighted, hovered, searchFields, mounted, domFocus } = ui;
    const virtual = (opts.focusModel ?? "input") === "input" && (searchFields > 0 || !mounted) && !domFocus;
    return (cached = last = same(last, {
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
      highlighted,
      hovered,
      active: activeOf(sections, hovered ?? highlighted),
      activeSection: ui.activeSection,
      variations: ui.variations,
      reactions: ui.held ? reactions : (reactions = opts.reactions),
    }));
  }

  // Controlled, later calls before the next render build on the last change.
  let nextCollapsed: readonly string[] | null = null;
  const setCollapsed = (id: string, value?: boolean) => {
    const current = nextCollapsed ?? collapsed();
    const ids = setCategoryCollapsed(current, id, value);
    if (ids === current) return;
    if (opts.collapsedCategories === undefined) ownCollapsed = ids;
    else nextCollapsed = ids;
    changed();
    opts.onCollapsedCategoriesChange?.([...ids]);
  };

  const state = {
    getSnapshot,
    subscribe: events.subscribe,
    /** Takes new options without notifying: for a framework syncing them from a render. */
    setOptions(next: PickerStateOptions<Icon>) {
      opts = next;
      nextCollapsed = null;
      cached = null;
    },
    setQuery(value: string) {
      if (opts.search === undefined) ownQuery = value;
      changed();
      opts.onSearchChange?.(value);
    },
    toggleCollapsed: (id: string) => setCollapsed(id),
    setCollapsed: (id: string, value: boolean) => setCollapsed(id, value),
    /** The keyboard position (an item id), or null for none. */
    highlight: (id: string | null) => put("highlighted", id),
    hover: (id: string | null) => put("hovered", id),
    setActiveSection: (id: string | null) => put("activeSection", id),
    setSkinTone: (tone: number) => store.setSkinTone(tone),
    /** Picks an item (the highlighted one by default) or a unified code: the selection, counted as used. */
    choose: (id = ui.highlighted): EmojiSelection | undefined => (id == null ? undefined : store.select(findItem(getSnapshot().sections, id)?.unified ?? id)),
    /** Opens an emoji's skin-tone variations; false when it has none. */
    openVariations(id: string | null) {
      const record = findItem(getSnapshot().sections, id)?.record;
      if (!record?.tones.length || record.imageUrl || opts.disableVariations) return false;
      put("variations", id);
      return true;
    },
    closeVariations: () => put("variations", null),
    /** A search field is shown (the highlight is then virtual with focusModel "input"). Returns its removal. */
    registerSearch() {
      put("searchFields", ui.searchFields + 1);
      return () => put("searchFields", ui.searchFields - 1);
    },
    /** Rendered: until then a search field is assumed, so the first render starts in the right focus mode. */
    mount: () => put("mounted", true),
    /** DOM focus is in a cell (Tab from the field): the highlight is roving while it's there. */
    setDomFocus: (value: boolean) => put("domFocus", value),
    /** While held, frequents keep their order; releasing catches up. */
    hold: (value: boolean) => put("held", value),
  };
  return state;
}

export type PickerState<Icon = unknown> = ReturnType<typeof createPickerState<Icon>>;

/**
 * Moves a picker's highlight through its shown sections, `columns` per row (`pageRows` for a page).
 * Directions are logical: mirror Left/Right for right to left. The new id, or null at an edge.
 */
export function moveHighlight(state: PickerState, direction: EmojiGridMove, { columns = 9, pageRows = 1 }: { columns?: number; pageRows?: number } = {}): string | null {
  const { sections, highlighted } = state.getSnapshot();
  const grid = createEmojiGrid(sections, { columns, rowHeight: 1 });
  const from = grid.indexOf(highlighted ?? "");
  const to = from < 0 ? (direction === "last" ? grid.count - 1 : 0) : moveInGrid(grid, from, direction, pageRows);
  const id = to == null ? null : (grid.at(to)?.id ?? null);
  if (id != null) state.highlight(id);
  return id;
}
