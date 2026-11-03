import * as React from "react";
import * as Epr from "emoji-picker-react/primitives";
import type { EmojiClickData, EmojiData as EprEmojiData } from "emoji-picker-react/primitives";
import type { EmojiSelection } from "../core/store";
import { fromEprTone, toEprCategories, toEprCustomEmojis, toEprData, toEprTone, type CategoryOption } from "./adapter";
import { useFrequentEmoji, useSkinTone } from "./hooks";
import { useEmojiContext, useStoreSnapshot } from "./provider";
import { SkinTone as OwnSkinTone, SkinToneButtonProvider } from "./skin-tone";
import { NavContext, SIZE_VARIABLES, SLOTS, listSlots, rootSlots, slotted, useStructureStyles } from "./slots";
import { ResultsList, ResultsProvider, useResults, useResultsKeyboard, type SearchResultsMode } from "./results";
import { useEmojiPopover } from "./popover";
import { CollapseContext, NoCollapse, collapseEngineInput, useCollapseState } from "./collapse";
import { engineGridKeys } from "./engine-grid";
import { moveEngineHighlight, useActiveDescendant, useControlsList, useEnginePointer, useHighlightMirror, useOwnHighlightEscape } from "./engine-highlight";
import { useHeldWhileActive } from "./hold";
import { useClippedScrollGuard } from "./scroll-guard";
import { KeyboardProvider, mergeRefs, useEdgeKeys, useKeyRegion, useUserKeyDown, withCurrentTarget, type PickerKeyboardEvent, type PickerKeyboardEventHandler } from "./keyboard";
import type { KeyboardAction } from "./keymap";
import { EmojiOverrides, type ArtworkMap } from "./overrides";
import { useRovingRow } from "./reactions";
import { StripList } from "./strip";
import { PickerDataContext, StripActiveEmojiContext, StripNavContext, StripProvider, type FocusModel, type PickerData, type PointerModel } from "./strip-context";

export type { SearchResultsMode };

export type { CategoryOption, FocusModel, PointerModel };

/**
 * Props for a custom section header. Spread everything except `category` onto the
 * header element; it stays sticky and measured. `category.toggleCollapsed` collapses
 * or expands the section (a no-op in search results, which ignore collapse).
 */
export type CategoryHeaderProps = Omit<Epr.CategoryHeaderRenderProps, "category"> & {
  category: { id: string; name: string; collapsed: boolean; toggleCollapsed: () => void };
};
export type ListComponents = Omit<Epr.ListComponents, "CategoryHeader"> & { CategoryHeader?: React.ComponentType<CategoryHeaderProps> };
/** Custom markup for parts. Spread the given props onto your element and keep its ref/geometry. */
export type PickerComponents = Omit<Epr.PickerComponents, "CategoryHeader"> & ListComponents;
export type EmojiCellProps = Epr.EmojiRenderProps;

export type SelectDetails = {
  /** Return a tapback to its compact row. */
  collapse?: () => void;
};

export type RootProps = Omit<React.HTMLAttributes<HTMLElement>, "onSelect" | "children" | "role" | "onKeyDown"> & {
  onSelect?: (selection: EmojiSelection, details: SelectDetails) => void;
  /**
   * Keys for the picker's actions, replacing the defaults per action (`DEFAULT_KEYMAP`).
   * `KeyboardEvent.key` values with optional modifiers: `{ select: ["Enter", "Tab"], "page-down": ["PageDown", "Ctrl+d"] }`.
   * An empty array unbinds an action.
   */
  keymap?: Partial<Record<KeyboardAction, readonly string[]>>;
  /**
   * Runs before the picker handles the key (after any part's own `onKeyDown`). Call
   * `event.preventEmojiPickerHandler()` to keep the picker from handling it.
   */
  onKeyDown?: PickerKeyboardEventHandler<HTMLElement>;
  /** Emoji per row; by default as many as the width fits. */
  columns?: number;
  /** Which categories show, in order, with optional names and icons. */
  categories?: readonly CategoryOption[];
  /** Size of the "Frequently used" section; false hides it. Default 16. */
  frequent?: number | false;
  /** Collapsed sections (category ids), controlled. Collapsed sections keep their header and hide their rows. */
  collapsedCategories?: readonly string[];
  /** Sections collapsed on mount, uncontrolled. */
  defaultCollapsedCategories?: readonly string[];
  onCollapsedCategoriesChange?: (ids: string[]) => void;
  /** Fixed emoji (unified codes) for the suggested section instead of frequents, e.g. Slack's "Getting Work Done". Name it with `categories`. */
  suggested?: readonly string[];
  /**
   * How search results show: "ranked" (one list, best match first and highlighted,
   * Enter picks it) or "grouped" (category sections, each in rank order). Results
   * come from the provider's `search`. Default "ranked".
   */
  searchResults?: SearchResultsMode;
  /** Most results to show for a query. Default 200. */
  searchLimit?: number;
  /** Placeholder of the search input. Default "Search". */
  searchPlaceholder?: string;
  /** Controlled search text. */
  search?: string;
  defaultSearch?: string;
  onSearchChange?: (value: string) => void;
  /** Focus the search field on mount. Default: true inside an EmojiPopover, false for an inline picker (so it doesn't steal focus or scroll the page). */
  autoFocusSearch?: boolean;
  /** Where focus lives while navigating: "input" (default; a highlight moves, focus stays in search) or "grid" (focus moves into the cells). */
  focusModel?: FocusModel;
  /** "follows" (default): hover moves the keyboard position. "independent": hover is only a style. */
  pointer?: PointerModel;
  /** Draw these emoji with your own art in this picker; see EmojiOverrides. */
  artwork?: ArtworkMap;
  /** @deprecated Use `focusModel` ("input" is `keepSearchFocus`). */
  keepSearchFocus?: boolean;
  /** Hide emoji added after this Unicode emoji version (e.g. 15.1), in the list and in search results. */
  emojiVersion?: number;
  /** Turn off skin-tone variations in the grid (no long press). */
  disableVariations?: boolean;
  components?: PickerComponents;
  /** Built-in light/dark color tokens; omit to style everything yourself. */
  colorScheme?: "light" | "dark" | "auto";
  nonce?: string;
  /**
   * Cascade layer for the engine's CSS. Default "base": after Tailwind's preflight
   * and before its utilities, so classes and plain CSS override it with no setup.
   */
  cssLayer?: string;
  children: React.ReactNode;
};

type InternalRootProps = RootProps & {
  reactions?: readonly string[];
  reactionsDefaultOpen?: boolean;
  allowExpandReactions?: boolean;
};

// epr's defaults read "Skin tone MEDIUM_DARK"; these are what a screen reader should say.
const LABELS = {
  skinToneNeutral: "Default skin tone",
  skinToneLight: "Light skin tone",
  skinToneMediumLight: "Medium-light skin tone",
  skinToneMedium: "Medium skin tone",
  skinToneMediumDark: "Medium-dark skin tone",
  skinToneDark: "Dark skin tone",
  expandReactions: "More emoji",
  searchPlaceholder: "Search",
  // The engine counts its own search, not the results shown; ResultsProvider announces those.
  searchResultsNone: "",
  searchResultsOne: "",
  searchResultsMany: "",
};

const NO_HIDDEN: string[] = [];

/** Pickers share one loader per store, so epr's data cache sees a stable identity. */
const loaders = new WeakMap<object, () => Promise<EprEmojiData>>();
/** And, once loaded, one converted dataset per store (and labels). */
const resolved = new WeakMap<object, { labels: unknown; data: EprEmojiData }>();
function resolvedData(store: ReturnType<typeof useEmojiContext>["store"], labels: ReturnType<typeof useEmojiContext>["labels"]): EprEmojiData {
  const cached = resolved.get(store);
  if (cached && cached.labels === labels) return cached.data;
  const data = toEprData(store.records(), store.groupNames(), labels);
  resolved.set(store, { labels, data });
  return data;
}

export const PickerRoot = React.forwardRef<HTMLElement, InternalRootProps>(function PickerRoot(
  { onSelect, frequent = 16, suggested, emojiVersion: emojiVersionProp, categories, collapsedCategories, defaultCollapsedCategories, onCollapsedCategoriesChange, search, defaultSearch, onSearchChange, disableVariations, reactions, searchPlaceholder, searchResults = "ranked", searchLimit = 200, columns, components, cssLayer = "base", style, autoFocusSearch, keymap, onKeyDown, onKeyDownCapture, focusModel: focusModelProp, pointer = "follows", keepSearchFocus, artwork, children, ...rest },
  ref,
) {
  const { store, renderer, imageUrl, labels, groups, maxVersion } = useEmojiContext();
  // Inside an EmojiPopover: picking closes it (unless closeOnSelect={false}).
  const popover = useEmojiPopover();
  const notify = React.useCallback(
    (selection: EmojiSelection, details: SelectDetails) => {
      onSelect?.(selection, details);
      if (popover?.closeOnSelect) popover.close();
    },
    [onSelect, popover],
  );
  const status = useStoreSnapshot((s) => s.status());
  // The renderer's limit (Twemoji's set) applies on top of the picker's own.
  const emojiVersion = maxVersion == null ? emojiVersionProp : Math.min(emojiVersionProp ?? Infinity, maxVersion);
  const [tone, setTone] = useSkinTone();
  const rootRef = React.useRef<HTMLElement | null>(null);
  // Frequents change with every pick; held while the user is in the picker so
  // nothing moves under the pointer or the focused cell.
  const top = useHeldWhileActive(useFrequentEmoji(frequent || 1), rootRef);
  const heldReactions = useHeldWhileActive(reactions, rootRef);
  useClippedScrollGuard(rootRef);
  const autoFocus = autoFocusSearch ?? Boolean(popover);
  const focusModel: FocusModel = focusModelProp ?? (keepSearchFocus === false ? "grid" : "input");
  useEnginePointer(rootRef, focusModel, pointer);
  useHighlightMirror(rootRef);
  const close = React.useCallback(() => {
    if (!popover) return false;
    popover.close();
    return true;
  }, [popover]);

  let emojiData = loaders.get(store);
  if (!emojiData) {
    emojiData = () => store.load().then(() => toEprData(store.records(), store.groupNames(), labels));
    loaders.set(store, emojiData);
  }
  const customEmojis = React.useMemo(() => (status === "ready" ? toEprCustomEmojis(store.records(), groups) : []), [status, store, groups]);
  const collapse = useCollapseState(collapsedCategories, defaultCollapsedCategories, onCollapsedCategoriesChange);
  // The engine has no collapse: collapsed sections go to it with no emoji. It keeps
  // their header (shown by the structure CSS) and drops their rows. With nothing
  // collapsed, every picker shares one dataset object, so nothing is rebuilt.
  const fullData = React.useMemo(() => (status === "ready" ? resolvedData(store, labels) : null), [status, store, labels]);
  const engine = React.useMemo(
    () => (fullData && collapse.collapsed.length ? collapseEngineInput(fullData, new Set(collapse.collapsed), customEmojis.map((c) => ({ id: c.id, group: c.group }))) : null),
    [fullData, collapse.collapsed, customEmojis],
  );
  const categoryProps = React.useMemo(() => (categories ? toEprCategories(categories) : null), [categories]);
  const slottedComponents = React.useMemo(() => rootSlots(components), [components]);
  // The engine renders suggested IDs verbatim, so the shared skin tone is applied here.
  const hideSuggested = engine?.hideSuggested ?? false;
  const suggestedEmojis = React.useMemo(
    () => (hideSuggested ? [] : (suggested ?? (frequent === false ? [] : top)).map((u) => store.withSkinTone(u))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [suggested, frequent, top, store, tone, hideSuggested],
  );
  useStructureStyles(rest.nonce);

  const nav = React.useMemo(() => ({ hidden: new Set((categories ?? []).filter((c) => c.nav === false).map((c) => c.id)) }), [categories]);
  const categoryNames = React.useMemo(() => Object.fromEntries((categories ?? []).filter((c) => c.name).map((c) => [c.id, c.name!])), [categories]);
  const pickResult = React.useCallback(
    (record: { unified: string; imageUrl?: string }) => {
      const selection = store.select(record.imageUrl ? record.unified : store.withSkinTone(record.unified));
      if (selection) notify(selection, {});
    },
    [store, notify],
  );

  const pickerData = React.useMemo<PickerData>(
    () => ({ suggested: suggestedEmojis, emojiVersion, pick: pickResult, autoFocusSearch: autoFocus, focusModel, pointer }),
    [suggestedEmojis, emojiVersion, pickResult, autoFocus, focusModel, pointer],
  );

  const handleClick = React.useCallback(
    (data: EmojiClickData, _event: MouseEvent, api?: { collapseToReactions: () => void }) => {
      const selection = store.select(data.unified);
      if (selection) notify(selection, { collapse: api?.collapseToReactions });
    },
    [store, notify],
  );

  return (
    <KeyboardProvider keymap={keymap} onKeyDown={onKeyDown} close={close}>
      {(keyboard) => (
    <Epr.Root
      ref={mergeRefs(ref, rootRef, keyboard.ref)}
      data-slot={SLOTS.root}
      {...rest}
      onKeyDownCapture={(e: React.KeyboardEvent<HTMLElement>) => {
        onKeyDownCapture?.(e);
        if (!e.isPropagationStopped()) keyboard.onKeyDownCapture(e);
      }}
      autoFocusSearch={autoFocus}
      keepSearchFocus={focusModel === "input"}
      cssLayer={cssLayer}
      components={slottedComponents}
      columns={columns}
      style={{ ...SIZE_VARIABLES, ...(columns ? { "--emoji-results-columns": columns } : {}), ...style } as React.CSSProperties}
      // Once loaded, the data itself rather than the loader: the engine then gets it in
      // the same render as customEmojis, instead of a frame with only the customs
      // (which mounts, and requests the images of, emoji the user never sees).
      emojiData={engine?.data ?? fullData ?? emojiData}
      customEmojis={customEmojis}
      hiddenEmojis={engine?.hiddenCustoms.length ? engine.hiddenCustoms : NO_HIDDEN}
      emojiStyle={renderer === "twemoji" ? Epr.EmojiStyle.TWITTER : Epr.EmojiStyle.NATIVE}
      getEmojiUrl={imageUrl}
      skinTone={toEprTone(tone)}
      onSkinToneChange={(t) => setTone(fromEprTone(t))}
      suggestedEmojis={suggestedEmojis}
      onEmojiClick={handleClick}
      onReactionClick={handleClick}
      reactions={heldReactions ? [...heldReactions] : undefined}
      variationsDisabled={disableVariations}
      emojiVersion={emojiVersion != null ? String(emojiVersion) : undefined}
      labels={searchPlaceholder ? { ...LABELS, searchPlaceholder } : LABELS}
      searchValue={search}
      defaultSearchValue={defaultSearch}
      onSearchChange={onSearchChange}
      {...(categoryProps ?? {})}
    >
      <ResultsProvider mode={searchResults} limit={searchLimit} categoryNames={categoryNames} emojiVersion={emojiVersion} onPick={pickResult}>
        <CollapseContext.Provider value={collapse}>
          <NavContext.Provider value={nav}>
            <PickerDataContext.Provider value={pickerData}>
              <StripProvider>
                <SkinToneButtonProvider value={components?.SkinToneButton}>{artwork ? <EmojiOverrides artwork={artwork}>{children}</EmojiOverrides> : children}</SkinToneButtonProvider>
              </StripProvider>
            </PickerDataContext.Provider>
          </NavContext.Provider>
        </CollapseContext.Provider>
      </ResultsProvider>
    </Epr.Root>
      )}
    </KeyboardProvider>
  );
});

export const Root = PickerRoot as React.ForwardRefExoticComponent<RootProps & React.RefAttributes<HTMLElement>>;

/** The hovered or focused emoji, resolved against the shared dataset. */
export function useActiveEmoji() {
  const { store } = useEmojiContext();
  const active = Epr.useActiveEmoji();
  const results = useResults();
  const strip = React.useContext(StripActiveEmojiContext);
  if (results?.active) return results.results[results.hovered >= 0 ? results.hovered : results.highlighted] ?? null;
  if (strip) return strip;
  return active ? (store.get(active.unified) ?? null) : null;
}

/** Sections, the current one, and a jump to one (what CategoryNav uses). Follows a horizontal List's scroll when one is mounted. */
export function useCategoryNavigation(): ReturnType<typeof Epr.useCategoryNavigation> {
  const engine = Epr.useCategoryNavigation();
  const strip = React.useContext(StripNavContext);
  return strip ? { ...engine, activeCategory: strip.active, jumpToCategory: strip.jump } : engine;
}

export { useSearchActions, useSearchState } from "emoji-picker-react/primitives";
export { useCollapsedCategories, type CollapsedCategories } from "./collapse";

type EngineSearchProps = React.ComponentProps<typeof Epr.Search>;
export type SearchProps = Omit<EngineSearchProps, "onKeyDown" | "inputProps"> & {
  /** Runs before the picker handles the key; see Root's `onKeyDown`. */
  onKeyDown?: PickerKeyboardEventHandler<HTMLDivElement>;
  inputProps?: Omit<NonNullable<EngineSearchProps["inputProps"]>, "onKeyDown"> & { onKeyDown?: PickerKeyboardEventHandler<HTMLInputElement> };
};
export type ListProps = Omit<React.ComponentProps<typeof Epr.List>, "components" | "onKeyDown"> & {
  /** Runs before the picker handles the key (on any cell); see Root's `onKeyDown`. */
  onKeyDown?: PickerKeyboardEventHandler<HTMLElement>;
  components?: ListComponents;
  /**
   * "vertical" (default): sections stacked, scrolling down. "horizontal": sections side
   * by side, each a column-major grid of `rows` rows with its title above its first
   * column, scrolling sideways (the iOS and Gboard emoji keyboards).
   */
  orientation?: "vertical" | "horizontal";
  /** Horizontal only: rows per section. Default 5. */
  rows?: number;
  /** Horizontal only: rows while search results show. Default `rows`; 1 gives a single scrolling row, as iOS does. */
  searchRows?: number;
  /** Classes for every emoji cell (`data-slot="emoji"`); state via data-highlighted, data-active. */
  cellClassName?: string;
  /** Classes for every section title (`data-slot="category-header"`). */
  headerClassName?: string;
};
export type CategoryNavProps = Omit<React.ComponentProps<typeof Epr.CategoryNav>, "onKeyDown"> & {
  /** Runs before the picker handles the key; see Root's `onKeyDown`. */
  onKeyDown?: PickerKeyboardEventHandler<HTMLDivElement>;
  /** Classes for every tab (`data-slot="category-tab"`); the current one has data-active. */
  tabClassName?: string;
};
export type ViewportProps = Omit<React.ComponentProps<typeof Epr.Viewport>, "onKeyDown"> & {
  /** Runs before the picker handles the key; see Root's `onKeyDown`. */
  onKeyDown?: PickerKeyboardEventHandler<HTMLDivElement>;
};

// Every part's root element carries a stable `data-slot`; style those, never the engine's markup.
export const Search = React.forwardRef<HTMLDivElement, SearchProps>(function Search({ inputProps, onKeyDown, ...props }, ref) {
  const resultsKeys = useResultsKeyboard();
  const strip = React.useContext(StripNavContext);
  const results = useResults();
  const { autoFocusSearch, focusModel } = React.useContext(PickerDataContext);
  const searchRef = React.useRef<HTMLDivElement | null>(null);
  const { onKeyDown: onInputKeyDown, onBlur: onInputBlur, ...input } = inputProps ?? {};
  const region = useKeyRegion((action, event) => {
    const field = event.target;
    if (!(field instanceof HTMLInputElement) || !action) return "pass";
    if (results?.active) return resultsKeys(action, event);
    if (focusModel === "grid") {
      // A horizontal List isn't one of the engine's regions: Down from the field enters it here.
      return action === "move-down" && strip?.focus() ? "handled" : "pass";
    }
    if (strip) return strip.key(action, field) ? "handled" : "pass";
    // The engine's list moves its own highlight with arrows and Enter; pages and ends are ours.
    if (action === "page-up" || action === "page-down" || action === "first" || action === "last") {
      const scroller = field.closest('[data-epr-part="root"]')?.querySelector<HTMLElement>(".epr-body");
      return scroller && moveEngineHighlight(field, scroller, action) ? "handled" : "pass";
    }
    return "pass";
  });
  // The input's handler, then the Search row's, as bubbling would call them.
  const userKeys = useUserKeyDown((event) => {
    const field = event.target instanceof HTMLInputElement ? event.target : null;
    if (field && onInputKeyDown) withCurrentTarget(event, field, () => onInputKeyDown(event as PickerKeyboardEvent<HTMLInputElement>));
    if (!event.isPropagationStopped()) onKeyDown?.(event as PickerKeyboardEvent<HTMLDivElement>);
  });
  const merged = React.useMemo(() => mergeRefs(ref, region, userKeys), [ref, region, userKeys]);
  useOwnHighlightEscape(searchRef, () => strip?.clear());
  // data-autofocus: an EmojiPopover focuses it once visible (autoFocus misses a hidden field).
  // The highlighted result or strip cell, while focus stays in the field (the engine's list sets its own).
  const activeDescendant = focusModel !== "input" ? undefined : results?.active ? (results.highlighted >= 0 ? results.cellId(results.highlighted) : undefined) : strip?.activeDescendant;
  useActiveDescendant(searchRef, activeDescendant);
  useControlsList(searchRef);
  const engineInput = {
    "data-slot": SLOTS.searchInput,
    ...(autoFocusSearch ? { "data-autofocus": "" } : {}),
    ...input,
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      strip?.clear();
      onInputBlur?.(e);
    },
  } as EngineSearchProps["inputProps"];
  return <Epr.Search data-slot={SLOTS.search} {...props} ref={mergeRefs(merged, searchRef)} inputProps={engineInput} />;
});
export const SearchInput = slotted(Epr.SearchInput, SLOTS.searchInput, "SearchInput");
const SlottedNav = slotted(Epr.CategoryNav, SLOTS.categoryNav, "CategoryNav");
export const CategoryNav = React.forwardRef<HTMLDivElement, CategoryNavProps>(function CategoryNav({ tabClassName, onKeyDown, ...props }, ref) {
  const parent = React.useContext(NavContext);
  const value = React.useMemo(() => ({ ...parent, tabClassName }), [parent, tabClassName]);
  const edges = useEdgeKeys('[role="tab"]');
  const userKeys = useUserKeyDown(onKeyDown as PickerKeyboardEventHandler | undefined);
  const merged = React.useMemo(() => mergeRefs(ref, edges, userKeys), [ref, edges, userKeys]);
  return (
    <NavContext.Provider value={value}>
      <SlottedNav {...props} ref={merged} />
    </NavContext.Provider>
  );
});
const SlottedViewport = slotted(Epr.Viewport, SLOTS.viewport, "Viewport");
export const Viewport = React.forwardRef<HTMLDivElement, ViewportProps>(function Viewport({ onKeyDown, ...props }, ref) {
  const userKeys = useUserKeyDown(onKeyDown as PickerKeyboardEventHandler | undefined);
  const merged = React.useMemo(() => mergeRefs(ref, userKeys), [ref, userKeys]);
  return <SlottedViewport {...props} ref={merged} />;
});
export const List = React.forwardRef<HTMLUListElement, ListProps>(function List({ components, cellClassName, headerClassName, orientation = "vertical", rows = 5, searchRows, onKeyDown, ...props }, ref) {
  const slots = React.useMemo(() => listSlots(components, { cell: cellClassName, header: headerClassName }), [components, cellClassName, headerClassName]);
  const results = useResults();
  const collapse = React.useContext(CollapseContext);
  const userKeys = useUserKeyDown(onKeyDown as PickerKeyboardEventHandler | undefined);
  const engineKeys = useKeyRegion(engineGridKeys);
  // The engine's keys only on the engine's list; the results grid registers its own region.
  const merged = React.useMemo(() => mergeRefs(ref, userKeys, engineKeys), [ref, userKeys, engineKeys]);
  const resultsRef = React.useMemo(() => mergeRefs(ref, userKeys), [ref, userKeys]);
  if (orientation === "horizontal")
    // Our own renderer for both the categories and the results (one element, so it
    // keeps its state across search); collapse applies to categories only.
    return (
      <CollapseContext.Provider value={results?.active ? NoCollapse : collapse}>
        <StripList {...(props as React.HTMLAttributes<HTMLDivElement>)} ref={ref as unknown as React.Ref<HTMLDivElement>} onKeyDown={onKeyDown as PickerKeyboardEventHandler<HTMLDivElement> | undefined} rows={rows} searchRows={searchRows} cell={slots.Emoji!} header={slots.CategoryHeader!} />
      </CollapseContext.Provider>
    );
  // Search results ignore collapse.
  if (results?.active)
    return (
      <CollapseContext.Provider value={NoCollapse}>
        <ResultsList ref={resultsRef as React.Ref<HTMLDivElement>} cell={slots.Emoji!} header={slots.CategoryHeader!} className={props.className} style={props.style} />
      </CollapseContext.Provider>
    );
  return <Epr.List data-slot={SLOTS.list} {...props} ref={merged} components={slots} />;
});
export const Preview = slotted(Epr.Preview, SLOTS.preview, "Preview");
export const SkinTone = OwnSkinTone;
const EngineEmpty = slotted(Epr.Empty, SLOTS.empty, "Empty");
/** Shown when a search finds nothing. */
export const Empty = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof Epr.Empty>>(function Empty(props, ref) {
  const results = useResults();
  const { search } = Epr.useSearchState();
  if (!results?.active) return <EngineEmpty {...props} ref={ref} />;
  if (results.results.length || results.pending) return null;
  const { children, ...rest } = props;
  return (
    <div {...rest} ref={ref} role="status" data-slot={SLOTS.empty}>
      {typeof children === "function" ? children({ search }) : children}
    </div>
  );
});
export const Loading = slotted(Epr.Loading, SLOTS.loading, "Loading");
export const LoadError = Epr.LoadError;
const SlottedReactions = slotted(Epr.Reactions, SLOTS.reactions, "Reactions");
/**
 * A tapback's reaction row: one tab stop (roving tabindex); arrows, Home and End
 * (the keymap's moves and first/last) move along it.
 */
export const Reactions = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof Epr.Reactions>>(function Reactions(props, ref) {
  const edges = useEdgeKeys("button");
  const row = React.useRef<HTMLDivElement | null>(null);
  useRovingRow(row);
  const merged = React.useMemo(() => mergeRefs(ref, edges, row), [ref, edges]);
  return <SlottedReactions {...props} ref={merged} />;
});
export const Panel = slotted(Epr.Panel, SLOTS.panel, "Panel");
