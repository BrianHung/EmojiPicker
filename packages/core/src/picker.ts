import { GROUPS, type EmojiRecord, type SkinToneValue } from "./dataset";
import { createEmojiGrid, moveInGrid, type EmojiGridMove } from "./grid";
import type { EmojiLabels } from "./labels";
import { createStore, memo, stable, subscribeAll } from "./reactive";
import { createSearch, type SearchState } from "./search/query";
import { categoryList, categorySections, itemFactory, resultSections, type Category, type CategoryOption, type EmojiItem, type EmojiSection } from "./sections";
import type { EmojiData, EmojiSelection, EmojiStore } from "./store";

export type SearchResultsMode = "ranked" | "grouped";

export type HighlightChangeDetails = { reason: "keyboard" | "pointer" | "none"; event?: Event };

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
  highlight?: string | null;
  defaultHighlight?: string | null;
  onHighlightChange?: (id: string | null, details: HighlightChangeDetails) => void;
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

type Held = { suggested: readonly string[]; reactions: readonly string[] | undefined };

type Ui = {
  query: string;
  collapsed: readonly string[];
  highlighted: string | null;
  hovered: string | null;
  activeSection: string | null;
  variations: string | null;
  inputs: number;
  mounted: boolean;
  domFocus: boolean;
  held: Held | null;
};

type UiAction = { type: "set"; patch: Partial<Ui> } | { type: "refresh" };

const reduceUi = (ui: Ui, action: UiAction): Ui => {
  if (action.type === "refresh") return { ...ui };
  const { patch } = action;
  return (Object.keys(patch) as (keyof Ui)[]).every((k) => Object.is(ui[k], patch[k])) ? ui : { ...ui, ...patch };
};

type Input<Icon> = { options: PickerStateOptions<Icon>; draft: readonly string[] | null };
type InputAction<Icon> = { type: "options"; options: PickerStateOptions<Icon> } | { type: "draft"; ids: readonly string[] };

const reduceInput = <Icon>(input: Input<Icon>, action: InputAction<Icon>): Input<Icon> => (action.type === "options" ? { options: action.options, draft: null } : { ...input, draft: action.ids });

type Controlled = Pick<PickerStateOptions, "query" | "highlight" | "collapsedCategories">;
const queryOf = (ui: Ui, options: Controlled) => options.query ?? ui.query;
const highlightedOf = (ui: Ui, options: Controlled) => (options.highlight === undefined ? ui.highlighted : options.highlight);
const collapsedOf = (ui: Ui, options: Controlled) => options.collapsedCategories ?? ui.collapsed;

export function createPickerState<Icon = unknown>(store: EmojiStore, options: PickerStateOptions<Icon> = {}) {
  const ui = createStore<Ui, UiAction>(
    {
      query: options.defaultQuery ?? "",
      collapsed: options.defaultCollapsedCategories ?? NO_IDS,
      highlighted: options.defaultHighlight ?? null,
      hovered: null,
      activeSection: null,
      variations: null,
      inputs: 0,
      mounted: false,
      domFocus: false,
      held: null,
    },
    reduceUi,
  );
  // Options arrive every render, so they update silently: nothing subscribes to this store
  const input = createStore<Input<Icon>, InputAction<Icon>>({ options, draft: null }, reduceInput);
  const search = createSearch(store);
  const set = (patch: Partial<Ui>) => ui.dispatch({ type: "set", patch });
  const opts = () => input.getSnapshot().options;

  const items = memo(itemFactory);
  const categoriesOf = memo((data: EmojiData, ready: boolean, categories: readonly CategoryOption<Icon>[] | undefined, labels: EmojiLabels) =>
    categoryList(
      categories,
      ready ? data.groupNames : [],
      labels,
      [...data.customGroups.values()].filter((g): g is string => !!g),
    ),
  );
  const suggestedOf = memo((list: readonly string[], _tone: number) => list.map((u) => store.withSkinTone(u)));
  const sectionsOf = memo((ready: boolean, categories: readonly Category<Icon>[], suggested: readonly string[], collapsed: readonly string[], emojiVersion: number | undefined, _tone: number, item: ReturnType<typeof itemFactory>) =>
    ready
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
  const resultSectionsOf = memo((results: readonly EmojiRecord[], mode: SearchResultsMode, categories: readonly Category<Icon>[], labels: EmojiLabels, groupNames: readonly string[], _tone: number, item: ReturnType<typeof itemFactory>) => {
    const name = (group: string) => categories.find((c) => c.id === group)?.name ?? (group === "custom" ? labels.custom : (groupNames[GROUPS.indexOf(group as (typeof GROUPS)[number])] ?? group));
    return resultSections(results, mode, name, (u) => store.withSkinTone(u), item, labels.searchResults);
  });
  const activeOf = memo(findItem);
  const keep = stable<PickerSnapshot<Icon>>();

  const select = memo((state: Ui, opts: PickerStateOptions<Icon>, ready: boolean, data: EmojiData, tone: SkinToneValue, frequent: readonly string[], found: SearchState): PickerSnapshot<Icon> => {
    const labels = opts.labels ?? store.labels();
    const item = items(labels);
    const query = queryOf(state, opts);
    const searching = query.trim().length > 0;
    const results = resultsOf(found.results, opts.emojiVersion);
    const categories = categoriesOf(data, ready, opts.categories, labels);
    const suggested = suggestedOf(opts.suggested ?? (opts.frequent === false ? NO_IDS : frequent), tone);
    const collapsed = collapsedOf(state, opts);
    const categorySections = sectionsOf(ready, categories, suggested, collapsed, opts.emojiVersion, tone, item);
    const sections = searching ? resultSectionsOf(results, opts.searchResults ?? "ranked", categories, labels, ready ? data.groupNames : NO_IDS, tone, item) : categorySections;
    const highlighted = highlightedOf(state, opts);
    const virtual = (state.inputs > 0 || !state.mounted) && !state.domFocus;
    return keep({
      query,
      searching,
      results,
      pending: found.pending,
      categories,
      categorySections,
      sections,
      collapsed,
      skinTone: tone,
      focus: virtual ? "virtual" : "roving",
      highlighted,
      hovered: state.hovered,
      active: activeOf(sections, highlighted ?? state.hovered),
      activeSection: state.activeSection,
      variations: state.variations,
      reactions: state.held ? state.held.reactions : opts.reactions,
    });
  });

  const frequentCount = () => (opts().frequent ?? 16) || 1;

  function getSnapshot(): PickerSnapshot<Icon> {
    const state = ui.getSnapshot();
    const options = opts();
    const { status, data } = store.getSnapshot();
    const frequent = state.held?.suggested ?? store.frequent(frequentCount());
    return select(state, options, status === "ready", data, store.skinTone(), frequent, search.run(queryOf(state, options), options.searchLimit ?? 200));
  }

  const setCollapsed = (id: string, value?: boolean) => {
    const { options, draft } = input.getSnapshot();
    const current = draft ?? collapsedOf(ui.getSnapshot(), options);
    const ids = setCategoryCollapsed(current, id, value);
    if (ids === current) return;
    if (options.collapsedCategories === undefined) set({ collapsed: ids });
    else input.dispatch({ type: "draft", ids });
    options.onCollapsedCategoriesChange?.(ids);
  };

  const state = {
    getSnapshot,
    subscribe: subscribeAll(ui.subscribe, store.subscribe, (listener) => store.frequents.subscribe(() => !ui.getSnapshot().held && listener()), search.subscribe),
    setOptions(next: PickerStateOptions<Icon>, { notify = false } = {}) {
      input.dispatch({ type: "options", options: next });
      if (notify) ui.dispatch({ type: "refresh" });
    },
    setQuery(value: string) {
      if (opts().query === undefined) set({ query: value });
      opts().onQueryChange?.(value);
    },
    toggleCollapsed: (id: string) => setCollapsed(id),
    setCollapsed: (id: string, value: boolean) => setCollapsed(id, value),
    highlight(id: string | null, details: HighlightChangeDetails = { reason: "none" }) {
      if (id === highlightedOf(ui.getSnapshot(), opts())) return;
      if (opts().highlight === undefined) set({ highlighted: id });
      opts().onHighlightChange?.(id, details);
    },
    hover: (id: string | null) => set({ hovered: id }),
    setActiveSection: (id: string | null) => set({ activeSection: id }),
    setSkinTone: (tone: SkinToneValue) => store.setSkinTone(tone),
    choose: (id = highlightedOf(ui.getSnapshot(), opts())): EmojiSelection | undefined => (id == null ? undefined : store.select(findItem(getSnapshot().sections, id)?.unified ?? id)),
    openVariations(id: string | null) {
      const record = findItem(getSnapshot().sections, id)?.record;
      if (!record?.tones.length || record.imageUrl || opts().disableVariations) return false;
      set({ variations: id });
      return true;
    },
    closeVariations: () => set({ variations: null }),
    registerInput() {
      set({ inputs: ui.getSnapshot().inputs + 1 });
      return () => set({ inputs: ui.getSnapshot().inputs - 1 });
    },
    mount: () => set({ mounted: true }),
    setDomFocus: (value: boolean) => set({ domFocus: value }),
    hold(value: boolean) {
      if (Boolean(ui.getSnapshot().held) === value) return;
      set({ held: value ? { suggested: store.frequent(frequentCount()), reactions: opts().reactions } : null });
    },
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
  if (id != null) state.highlight(id, { reason: "keyboard" });
  return id;
}
