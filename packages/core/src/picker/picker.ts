import { type ChangeDetails, controllable, createChangeDetails } from "../change";
import { withoutTone, type EmojiRecord, type SkinToneValue } from "../dataset";
import type { EmojiLabels } from "../labels";
import { createStore, memo, patch, shallowEqual, stable, subscribeAll, type Subscribe } from "../reactive";
import { createSearch, type EmojiSearchState } from "../search/query";
import type { EmojiSelection, EmojiStore } from "../store";
import {
  categoryList,
  categorySections,
  findItem,
  groupName,
  itemFactory,
  resultSections,
  setCategoryCollapsed,
  shownIn,
  type Category,
  type CategoryOption,
  type EmojiItem,
  type EmojiSection,
  type ItemFactory,
  type SearchResultsMode,
} from "./sections";

export type HighlightChangeDetails = ChangeDetails<"keyboard" | "pointer" | "imperative-action" | "none"> & { key: string | null };
export type QueryChangeDetails = ChangeDetails<"input-change" | "clear-press" | "escape-key" | "imperative-action" | "none">;
export type CollapsedCategoriesChangeDetails = ChangeDetails<"trigger-press" | "none">;

export interface ChangeSource<D extends ChangeDetails> {
  reason?: D["reason"];
  event?: Event;
}

export interface EmojiPickerOptions<Icon = unknown> {
  labels?: EmojiLabels;
  categories?: readonly CategoryOption<Icon>[];
  frequent?: number | false;
  suggested?: readonly string[];
  emojiVersion?: number;
  searchResults?: SearchResultsMode;
  searchLimit?: number;
  query?: string;
  defaultQuery?: string;
  onQueryChange?: (query: string, details: QueryChangeDetails) => void;
  collapsedCategories?: readonly string[];
  defaultCollapsedCategories?: readonly string[];
  onCollapsedCategoriesChange?: (ids: readonly string[], details: CollapsedCategoriesChangeDetails) => void;
  highlight?: string | null;
  defaultHighlight?: string | null;
  onHighlightChange?: (unified: string | null, details: HighlightChangeDetails) => void;
  disableVariations?: boolean;
  reactions?: readonly string[] | number;
}

// "virtual": a search field or keyboard target keeps DOM focus and the grid follows aria-activedescendant
export type FocusMode = "virtual" | "roving";

export interface EmojiPickerSnapshot<Icon = unknown> {
  query: string;
  searching: boolean;
  results: readonly EmojiRecord[];
  pending: boolean;
  searchError: Error | null;
  categories: readonly Category<Icon>[];
  categorySections: readonly EmojiSection[];
  sections: readonly EmojiSection[];
  collapsed: readonly string[];
  skinTone: SkinToneValue;
  focus: FocusMode;
  highlighted: string | null;
  hovered: string | null;
  active: EmojiItem | null;
  activeSection: string | null;
  variations: string | null;
  reactions: readonly string[] | undefined;
  // The grid's one tab stop and the pressed cell, by item id
  tabStop: string | null;
  pressed: string | null;
}

export interface EmojiPickerStore<Icon = unknown> {
  getSnapshot(): EmojiPickerSnapshot<Icon>;
  subscribe: Subscribe;
  setOptions(options: EmojiPickerOptions<Icon>): void;
  setQuery(query: string, source?: ChangeSource<QueryChangeDetails>): QueryChangeDetails | undefined;
  toggleCollapsed(id: string, source?: ChangeSource<CollapsedCategoriesChangeDetails>): void;
  setCollapsed(id: string, collapsed: boolean, source?: ChangeSource<CollapsedCategoriesChangeDetails>): void;
  // An item id, or a unified code that resolves to its first item
  highlight(emoji: string | null, source?: ChangeSource<HighlightChangeDetails>): void;
  // The highlight a new set of searched sections should get: the first result, or the same emoji for the same query
  retainHighlight(sections: readonly EmojiSection[], last: string | null): { key: string | null } | null;
  hover(id: string | null): void;
  setActiveSection(id: string | null): void;
  setTabStop(id: string | null): void;
  press(id: string | null): void;
  choose(id?: string | null): EmojiSelection | undefined;
  openVariations(id: string | null): boolean;
  closeVariations(): void;
  // A search field or keyboard target that drives the grid with virtual focus
  registerInput(): () => void;
  mount(): void;
  setDomFocus(focused: boolean): void;
  // Freezes the suggested and reaction rows while the pointer or focus is inside, so a pick doesn't reorder them
  hold(held: boolean): void;
}

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
  tabStop: string | null;
  pressed: string | null;
};

type Input<Icon> = { options: EmojiPickerOptions<Icon>; draft: readonly string[] | null };
type InputAction<Icon> = { type: "options"; options: EmojiPickerOptions<Icon> } | { type: "draft"; ids: readonly string[] };

const reduceInput = <Icon>(input: Input<Icon>, action: InputAction<Icon>): Input<Icon> => {
  switch (action.type) {
    case "options":
      return input.draft === null && shallowEqual(input.options, action.options) ? input : { options: action.options, draft: null };
    case "draft":
      return { ...input, draft: action.ids };
    default:
      return action satisfies never;
  }
};

// What the last search highlighted, so new results for the same query keep it
type Retained = { query: string; unified?: string };

type Controlled = Pick<EmojiPickerOptions, "query" | "highlight" | "collapsedCategories">;
const queryOf = (ui: Ui, options: Controlled) => options.query ?? ui.query;
const collapsedOf = (ui: Ui, options: Controlled) => options.collapsedCategories ?? ui.collapsed;

const NO_IDS: readonly string[] = [];
const NO_SECTIONS: readonly EmojiSection[] = [];
const DEFAULT_FREQUENT = 16;
const DEFAULT_SEARCH_LIMIT = 200;

// A highlight is an item key or a unified code. A key whose emoji changed tone maps to the same emoji in its section; one that left the sections clears
function resolveKey(sections: readonly EmojiSection[], value: string | null, last: string | null): string | null {
  if (value == null || findItem(sections, value)) return value;
  if (findItem(sections, last)?.unified === value) return last;
  const section = sections.find((s) => value.startsWith(`${s.id}:`));
  const unified = section ? value.slice(section.id.length + 1) : value;
  const items = (section ? [section] : sections).flatMap((s) => s.items);
  return (items.find((i) => i.unified === unified) ?? items.find((i) => withoutTone(i.unified) === withoutTone(unified)))?.id ?? null;
}

function retain(kept: Retained, sections: readonly EmojiSection[], query: string, last: string | null): { kept: Retained; target: EmojiItem | undefined } {
  const all = sections.flatMap((s) => s.items);
  const unified = all.find((i) => i.id === last)?.unified ?? kept.unified;
  const target = (kept.query === query ? all.find((i) => i.unified === unified) : undefined) ?? all[0];
  return { kept: { query, unified: target?.unified }, target };
}

export function createEmojiPicker<Icon = unknown>(store: EmojiStore, options: EmojiPickerOptions<Icon> = {}): EmojiPickerStore<Icon> {
  const ui = createStore<Ui, Partial<Ui>>(
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
      tabStop: null,
      pressed: null,
    },
    patch,
  );
  const input = createStore<Input<Icon>, InputAction<Icon>>({ options, draft: null }, reduceInput);
  const opts = () => input.getSnapshot().options;
  const searchOf = (state: Ui, current: EmojiPickerOptions<Icon>) => ({ query: queryOf(state, current), limit: current.searchLimit ?? DEFAULT_SEARCH_LIMIT });
  const initial = searchOf(ui.getSnapshot(), options);
  const search = createSearch(store, initial);
  const syncSearch = () => {
    const { query, limit } = searchOf(ui.getSnapshot(), opts());
    search.setQuery(query, limit);
  };
  let kept: Retained = { query: "" };

  const items = memo(itemFactory);
  const categoriesOf = memo((groupNames: readonly string[], customGroups: ReadonlyMap<string, string | undefined>, categories: readonly CategoryOption<Icon>[] | undefined, labels: EmojiLabels) =>
    categoryList(
      categories,
      groupNames,
      labels,
      [...customGroups.values()].filter((g): g is string => !!g),
    ),
  );
  const sectionsOf = memo(
    (
      records: readonly EmojiRecord[],
      customGroups: ReadonlyMap<string, string | undefined>,
      ready: boolean,
      categories: readonly Category<Icon>[],
      suggested: readonly string[],
      collapsed: readonly string[],
      emojiVersion: number | undefined,
      tone: SkinToneValue,
      item: ItemFactory,
    ) => (ready ? categorySections({ categories, records, suggested, customGroup: (u) => customGroups.get(u), collapsed, emojiVersion, get: store.get, tone, item }) : NO_SECTIONS),
  );
  const resultsOf = memo((results: readonly EmojiRecord[], emojiVersion: number | undefined) => (emojiVersion == null ? results : results.filter(shownIn(emojiVersion))));
  const resultSectionsOf = memo((results: readonly EmojiRecord[], mode: SearchResultsMode, categories: readonly Category<Icon>[], labels: EmojiLabels, groupNames: readonly string[], tone: SkinToneValue, item: ItemFactory) => {
    const name = (group: string) => categories.find((c) => c.id === group)?.name ?? (group === "custom" ? labels.custom : groupName(groupNames, group));
    return resultSections(results, mode, name, tone, item, labels.searchResults);
  });
  const activeOf = memo(findItem);
  const keep = stable<EmojiPickerSnapshot<Icon>>();
  const frequentCount = () => (opts().frequent ?? DEFAULT_FREQUENT) || 1;
  const reactionsOf = (reactions: EmojiPickerOptions<Icon>["reactions"]) => (typeof reactions === "number" ? store.frequent(reactions) : reactions);

  const select = memo(
    (state: Ui, current: EmojiPickerOptions<Icon>, ready: boolean, records: readonly EmojiRecord[], tone: SkinToneValue, frequent: readonly string[], found: EmojiSearchState, storeLabels: EmojiLabels): EmojiPickerSnapshot<Icon> => {
      const labels = current.labels ?? storeLabels;
      const item = items(labels);
      const groupNames = ready ? store.groupNames() : NO_IDS;
      const customGroups = store.customGroups();
      const query = queryOf(state, current);
      const searching = query.trim().length > 0;
      const results = resultsOf(found.results, current.emojiVersion);
      const categories = categoriesOf(groupNames, customGroups, current.categories, labels);
      const suggested = current.suggested ?? (current.frequent === false ? NO_IDS : frequent);
      const collapsed = collapsedOf(state, current);
      const categorySections = sectionsOf(records, customGroups, ready, categories, suggested, collapsed, current.emojiVersion, tone, item);
      const sections = searching ? resultSectionsOf(results, current.searchResults ?? "ranked", categories, labels, groupNames, tone, item) : categorySections;
      const highlighted = resolveKey(sections, current.highlight === undefined ? state.highlighted : current.highlight, state.highlighted);
      const virtual = (state.inputs > 0 || !state.mounted) && !state.domFocus;
      return keep({
        query,
        searching,
        results,
        pending: found.pending,
        searchError: found.error,
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
        reactions: state.held ? state.held.reactions : reactionsOf(current.reactions),
        tabStop: state.tabStop,
        pressed: state.pressed,
      });
    },
  );

  function getSnapshot(): EmojiPickerSnapshot<Icon> {
    const state = ui.getSnapshot();
    return select(state, opts(), store.status() === "ready", store.records(), store.skinTone(), state.held?.suggested ?? store.frequent(frequentCount()), search.getSnapshot(), store.labels());
  }

  const set = (fields: Partial<Ui>) => ui.dispatch(fields);

  const query = controllable<string, QueryChangeDetails>({
    controlled: () => opts().query,
    own: () => ui.getSnapshot().query,
    onChange: () => opts().onQueryChange,
    write: (value) => set({ query: value }),
  });

  const collapsed = controllable<readonly string[], CollapsedCategoriesChangeDetails>({
    controlled: () => input.getSnapshot().draft ?? opts().collapsedCategories,
    own: () => ui.getSnapshot().collapsed,
    onChange: () => opts().onCollapsedCategoriesChange,
    write: (ids) => set({ collapsed: ids }),
    writeControlled: (ids) => input.dispatch({ type: "draft", ids }),
  });

  const unifiedOf = (key: string | null) => findItem(getSnapshot().sections, key)?.unified ?? null;
  // Kept when controlled too: the owner's unified code then resolves to this key, not to the emoji's first section
  const highlighted = controllable<string | null, HighlightChangeDetails>({
    controlled: () => undefined,
    own: () => getSnapshot().highlighted,
    onChange: () => {
      const onChange = opts().onHighlightChange;
      return onChange && ((key, details) => onChange(unifiedOf(key), details));
    },
    write: (key) => set({ highlighted: key }),
  });

  const changeCollapsed = (id: string, value: boolean | undefined, { reason = "none", event }: ChangeSource<CollapsedCategoriesChangeDetails>) =>
    void collapsed.set(setCategoryCollapsed(collapsed.value(), id, value), createChangeDetails(reason, event));

  return {
    getSnapshot,
    subscribe: subscribeAll(ui.subscribe, input.subscribe, store.subscribe, (listener) => store.frequents.subscribe(() => !ui.getSnapshot().held && listener()), search.subscribe),
    setOptions(next) {
      input.dispatch({ type: "options", options: next });
      syncSearch();
    },
    setQuery(value, { reason = "none", event } = {}) {
      const details = query.set(value, createChangeDetails(reason, event));
      syncSearch();
      return details;
    },
    toggleCollapsed: (id, source = {}) => changeCollapsed(id, undefined, source),
    setCollapsed: (id, value, source = {}) => changeCollapsed(id, value, source),
    highlight(emoji, { reason = "none", event } = {}) {
      const { sections, highlighted: current, searching } = getSnapshot();
      const key = resolveKey(sections, emoji, current);
      if (searching && key != null) kept = { ...kept, unified: findItem(sections, key)?.unified };
      highlighted.set(key, Object.assign(createChangeDetails(reason, event), { key }));
    },
    retainHighlight(sections, last) {
      const { searching, query: q } = getSnapshot();
      if (!searching) {
        if (!kept.query) return null;
        kept = { query: "" };
        return { key: null };
      }
      const next = retain(kept, sections, q, last);
      kept = next.kept;
      return { key: next.target?.id ?? null };
    },
    hover: (id) => set({ hovered: id }),
    setActiveSection: (id) => set({ activeSection: id }),
    setTabStop: (id) => set({ tabStop: id }),
    press: (id) => set({ pressed: id }),
    choose: (id = getSnapshot().highlighted) => (id == null ? undefined : store.select(findItem(getSnapshot().sections, id)?.unified ?? id)),
    openVariations(id) {
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
    setDomFocus: (value) => set({ domFocus: value }),
    hold(value) {
      if (Boolean(ui.getSnapshot().held) === value) return;
      set({ held: value ? { suggested: store.frequent(frequentCount()), reactions: reactionsOf(opts().reactions) } : null });
    },
  };
}
