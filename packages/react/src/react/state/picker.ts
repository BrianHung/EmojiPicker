import { createChangeDetails, createSearch, GROUPS, withoutTone, type ChangeDetails, type EmojiLabels, type EmojiRecord, type EmojiSearchState, type EmojiSelection, type EmojiStore, type SkinToneValue } from "@brianhung/emoji-picker-core";
import { createStore, memo, stable, subscribeAll } from "./reactive";
import { categoryList, categorySections, itemFactory, resultSections, type Category, type CategoryOption, type EmojiItem, type EmojiSection } from "./sections";

export type SearchResultsMode = "ranked" | "grouped";

export type HighlightChangeDetails = ChangeDetails<"keyboard" | "pointer" | "imperative-action" | "none"> & { key: string | null };
export type QueryChangeDetails = ChangeDetails<"input-change" | "clear-press" | "escape-key" | "imperative-action" | "none">;
export type CollapsedCategoriesChangeDetails = ChangeDetails<"trigger-press" | "none">;

export type ChangeSource<D extends ChangeDetails> = { reason?: D["reason"]; event?: Event };

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
  onQueryChange?: (query: string, details: QueryChangeDetails) => void;
  collapsedCategories?: readonly string[];
  defaultCollapsedCategories?: readonly string[];
  onCollapsedCategoriesChange?: (ids: readonly string[], details: CollapsedCategoriesChangeDetails) => void;
  highlight?: string | null;
  defaultHighlight?: string | null;
  onHighlightChange?: (unified: string | null, details: HighlightChangeDetails) => void;
  disableVariations?: boolean;
  reactions?: readonly string[] | number;
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

type Toned = (unified: string) => string;
type Items = ReturnType<typeof itemFactory>;

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

// A highlight is an item key or a unified code. A key whose emoji changed tone maps to the same emoji in its section; one that left the sections clears
function resolveKey(sections: readonly EmojiSection[], value: string | null, last: string | null): string | null {
  if (value == null || findItem(sections, value)) return value;
  const previous = findItem(sections, last);
  if (previous?.unified === value) return last;
  const section = sections.find((s) => value.startsWith(`${s.id}:`));
  const unified = section ? value.slice(section.id.length + 1) : value;
  const base = withoutTone(unified);
  let toned: string | null = null;
  for (const s of section ? [section] : sections)
    for (const item of s.items) {
      if (item.unified === unified) return item.id;
      toned ??= withoutTone(item.unified) === base ? item.id : null;
    }
  return toned;
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
  const input = createStore<Input<Icon>, InputAction<Icon>>({ options, draft: null }, reduceInput);
  const search = createSearch(store);
  const set = (patch: Partial<Ui>) => ui.dispatch({ type: "set", patch });
  const opts = () => input.getSnapshot().options;

  const items = memo(itemFactory);
  const categoriesOf = memo((groupNames: readonly string[], customGroups: ReadonlyMap<string, string | undefined>, categories: readonly CategoryOption<Icon>[] | undefined, labels: EmojiLabels) =>
    categoryList(
      categories,
      groupNames,
      labels,
      [...customGroups.values()].filter((g): g is string => !!g),
    ),
  );
  const tonedIn = memo((_records: readonly EmojiRecord[], _tone: SkinToneValue) => (unified: string) => store.withSkinTone(unified));
  const suggestedOf = memo((list: readonly string[], withTone: Toned) => list.map((u) => withTone(u)));
  const sectionsOf = memo(
    (
      records: readonly EmojiRecord[],
      customGroups: ReadonlyMap<string, string | undefined>,
      ready: boolean,
      categories: readonly Category<Icon>[],
      suggested: readonly string[],
      collapsed: readonly string[],
      emojiVersion: number | undefined,
      withTone: Toned,
      item: Items,
    ) =>
      ready
        ? categorySections({
            categories,
            records,
            suggested,
            customGroup: (u) => customGroups.get(u),
            collapsed: (id) => collapsed.includes(id),
            emojiVersion,
            get: store.get,
            withSkinTone: withTone,
            item,
          })
        : NO_SECTIONS,
  );
  const resultsOf = memo((results: readonly EmojiRecord[], emojiVersion: number | undefined) => (emojiVersion == null ? results : results.filter((r) => r.imageUrl || r.version <= emojiVersion)));
  const resultSectionsOf = memo((results: readonly EmojiRecord[], mode: SearchResultsMode, categories: readonly Category<Icon>[], labels: EmojiLabels, groupNames: readonly string[], withTone: Toned, item: Items) => {
    const name = (group: string) => categories.find((c) => c.id === group)?.name ?? (group === "custom" ? labels.custom : (groupNames[GROUPS.indexOf(group as (typeof GROUPS)[number])] ?? group));
    return resultSections(results, mode, name, withTone, item, labels.searchResults);
  });
  const activeOf = memo(findItem);
  const keep = stable<PickerSnapshot<Icon>>();

  const select = memo(
    (state: Ui, opts: PickerStateOptions<Icon>, ready: boolean, records: readonly EmojiRecord[], tone: SkinToneValue, frequent: readonly string[], found: EmojiSearchState, storeLabels: EmojiLabels): PickerSnapshot<Icon> => {
      const labels = opts.labels ?? storeLabels;
      const item = items(labels);
      const groupNames = ready ? store.groupNames() : NO_IDS;
      const customGroups = store.customGroups();
      const query = queryOf(state, opts);
      const searching = query.trim().length > 0;
      const results = resultsOf(found.results, opts.emojiVersion);
      const categories = categoriesOf(groupNames, customGroups, opts.categories, labels);
      const withTone = tonedIn(records, tone);
      const suggested = suggestedOf(opts.suggested ?? (opts.frequent === false ? NO_IDS : frequent), withTone);
      const collapsed = collapsedOf(state, opts);
      const categorySections = sectionsOf(records, customGroups, ready, categories, suggested, collapsed, opts.emojiVersion, withTone, item);
      const sections = searching ? resultSectionsOf(results, opts.searchResults ?? "ranked", categories, labels, groupNames, withTone, item) : categorySections;
      const highlighted = resolveKey(sections, opts.highlight === undefined ? state.highlighted : opts.highlight, state.highlighted);
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
        reactions: state.held ? state.held.reactions : reactionsOf(opts.reactions),
      });
    },
  );

  // Options arrive during render, where subscribers can't be told; a later notify publishes what they changed
  let unpublished = false;
  const frequentCount = () => (opts().frequent ?? 16) || 1;
  const reactionsOf = (reactions: PickerStateOptions<Icon>["reactions"]) => (typeof reactions === "number" ? store.frequent(reactions) : reactions);

  function getSnapshot(): PickerSnapshot<Icon> {
    const state = ui.getSnapshot();
    const options = opts();
    const frequent = state.held?.suggested ?? store.frequent(frequentCount());
    return select(state, options, store.status() === "ready", store.records(), store.skinTone(), frequent, search.run(queryOf(state, options), options.searchLimit ?? 200), store.labels());
  }

  const setCollapsed = (id: string, value: boolean | undefined, { reason = "none", event }: ChangeSource<CollapsedCategoriesChangeDetails>) => {
    const { options, draft } = input.getSnapshot();
    const current = draft ?? collapsedOf(ui.getSnapshot(), options);
    const ids = setCategoryCollapsed(current, id, value);
    if (ids === current) return;
    const details = createChangeDetails(reason, event);
    options.onCollapsedCategoriesChange?.(ids, details);
    if (details.isCanceled) return;
    if (options.collapsedCategories === undefined) set({ collapsed: ids });
    else input.dispatch({ type: "draft", ids });
  };

  const state = {
    getSnapshot,
    subscribe: subscribeAll(ui.subscribe, store.subscribe, (listener) => store.frequents.subscribe(() => !ui.getSnapshot().held && listener()), search.subscribe),
    setOptions(next: PickerStateOptions<Icon>, { notify = false } = {}) {
      const before = getSnapshot();
      input.dispatch({ type: "options", options: next });
      unpublished ||= getSnapshot() !== before;
      if (!notify || !unpublished) return;
      unpublished = false;
      ui.dispatch({ type: "refresh" });
    },
    setQuery(value: string, { reason = "none", event }: ChangeSource<QueryChangeDetails> = {}): QueryChangeDetails | undefined {
      if (value === queryOf(ui.getSnapshot(), opts())) return;
      const details = createChangeDetails(reason, event);
      opts().onQueryChange?.(value, details);
      if (!details.isCanceled && opts().query === undefined) set({ query: value });
      return details;
    },
    toggleCollapsed: (id: string, source: ChangeSource<CollapsedCategoriesChangeDetails> = {}) => setCollapsed(id, undefined, source),
    setCollapsed: (id: string, value: boolean, source: ChangeSource<CollapsedCategoriesChangeDetails> = {}) => setCollapsed(id, value, source),
    highlight(emoji: string | null, { reason = "none", event }: ChangeSource<HighlightChangeDetails> = {}) {
      const { sections, highlighted } = getSnapshot();
      const key = resolveKey(sections, emoji, highlighted);
      if (key === highlighted) return;
      const details = Object.assign(createChangeDetails(reason, event), { key });
      opts().onHighlightChange?.(findItem(sections, key)?.unified ?? null, details);
      // Kept when controlled too: the owner's unified code then resolves to this key, not to the emoji's first section
      if (!details.isCanceled) set({ highlighted: key });
    },
    hover: (id: string | null) => set({ hovered: id }),
    setActiveSection: (id: string | null) => set({ activeSection: id }),
    choose: (id = getSnapshot().highlighted): EmojiSelection | undefined => (id == null ? undefined : store.select(findItem(getSnapshot().sections, id)?.unified ?? id)),
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
      set({ held: value ? { suggested: store.frequent(frequentCount()), reactions: reactionsOf(opts().reactions) } : null });
    },
  };
  return state;
}

export type PickerState<Icon = unknown> = ReturnType<typeof createPickerState<Icon>>;
