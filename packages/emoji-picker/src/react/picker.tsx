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
import { StripList } from "./strip";
import { PickerDataContext, StripActiveEmojiContext, StripNavContext, StripProvider, type PickerData } from "./strip-context";

export type { SearchResultsMode };

export type { CategoryOption };

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

export type RootProps = Omit<React.HTMLAttributes<HTMLElement>, "onSelect" | "children" | "role"> & {
  onSelect?: (selection: EmojiSelection, details: SelectDetails) => void;
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
  /** Arrow keys move a highlight while focus stays in search; Enter picks. */
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
};

const NO_HIDDEN: string[] = [];

/** Pickers share one loader per store, so epr's data cache sees a stable identity. */
const loaders = new WeakMap<object, () => Promise<EprEmojiData>>();

export const PickerRoot = React.forwardRef<HTMLElement, InternalRootProps>(function PickerRoot(
  { onSelect, frequent = 16, suggested, emojiVersion, categories, collapsedCategories, defaultCollapsedCategories, onCollapsedCategoriesChange, search, defaultSearch, onSearchChange, disableVariations, reactions, searchPlaceholder, searchResults = "ranked", searchLimit = 200, columns, components, cssLayer = "base", style, autoFocusSearch, children, ...rest },
  ref,
) {
  const { store, renderer, imageUrl, labels, groups } = useEmojiContext();
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
  const [tone, setTone] = useSkinTone();
  const top = useFrequentEmoji(frequent || 1);

  let emojiData = loaders.get(store);
  if (!emojiData) {
    emojiData = () => store.load().then(() => toEprData(store.records(), store.groupNames(), labels));
    loaders.set(store, emojiData);
  }
  const customEmojis = React.useMemo(() => (status === "ready" ? toEprCustomEmojis(store.records(), groups) : []), [status, store, groups]);
  const collapse = useCollapseState(collapsedCategories, defaultCollapsedCategories, onCollapsedCategoriesChange);
  // The engine has no collapse: collapsed sections go to it with no emoji. It keeps
  // their header (shown by the structure CSS) and drops their rows. The loader stays
  // the input while nothing is collapsed, so the common case never rebuilds data.
  const fullData = React.useMemo(() => (status === "ready" ? toEprData(store.records(), store.groupNames(), labels) : null), [status, store, labels]);
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

  const pickerData = React.useMemo<PickerData>(() => ({ suggested: suggestedEmojis, emojiVersion, pick: pickResult }), [suggestedEmojis, emojiVersion, pickResult]);

  const handleClick = React.useCallback(
    (data: EmojiClickData, _event: MouseEvent, api?: { collapseToReactions: () => void }) => {
      const selection = store.select(data.unified);
      if (selection) notify(selection, { collapse: api?.collapseToReactions });
    },
    [store, notify],
  );

  return (
    <Epr.Root
      ref={ref}
      data-slot={SLOTS.root}
      {...rest}
      autoFocusSearch={autoFocusSearch ?? Boolean(popover)}
      cssLayer={cssLayer}
      components={slottedComponents}
      columns={columns}
      style={{ ...SIZE_VARIABLES, ...(columns ? { "--emoji-results-columns": columns } : {}), ...style } as React.CSSProperties}
      emojiData={engine?.data ?? emojiData}
      customEmojis={customEmojis}
      hiddenEmojis={engine?.hiddenCustoms.length ? engine.hiddenCustoms : NO_HIDDEN}
      emojiStyle={renderer === "twemoji" ? Epr.EmojiStyle.TWITTER : Epr.EmojiStyle.NATIVE}
      getEmojiUrl={imageUrl}
      skinTone={toEprTone(tone)}
      onSkinToneChange={(t) => setTone(fromEprTone(t))}
      suggestedEmojis={suggestedEmojis}
      onEmojiClick={handleClick}
      onReactionClick={handleClick}
      reactions={reactions ? [...reactions] : undefined}
      variationsDisabled={disableVariations}
      emojiVersion={emojiVersion != null ? String(emojiVersion) : undefined}
      labels={searchPlaceholder ? { ...LABELS, searchPlaceholder } : LABELS}
      searchValue={search}
      defaultSearchValue={defaultSearch}
      onSearchChange={onSearchChange}
      {...(categoryProps ?? {})}
    >
      <ResultsProvider mode={searchResults} limit={searchLimit} columns={columns} categoryNames={categoryNames} emojiVersion={emojiVersion} onPick={pickResult}>
        <CollapseContext.Provider value={collapse}>
          <NavContext.Provider value={nav}>
            <PickerDataContext.Provider value={pickerData}>
              <StripProvider>
                <SkinToneButtonProvider value={components?.SkinToneButton}>{children}</SkinToneButtonProvider>
              </StripProvider>
            </PickerDataContext.Provider>
          </NavContext.Provider>
        </CollapseContext.Provider>
      </ResultsProvider>
    </Epr.Root>
  );
});

export const Root = PickerRoot as React.ForwardRefExoticComponent<RootProps & React.RefAttributes<HTMLElement>>;

/** The hovered or focused emoji, resolved against the shared dataset. */
export function useActiveEmoji() {
  const { store } = useEmojiContext();
  const active = Epr.useActiveEmoji();
  const results = useResults();
  const strip = React.useContext(StripActiveEmojiContext);
  if (results?.active) return results.results[results.highlighted] ?? null;
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

export type SearchProps = React.ComponentProps<typeof Epr.Search>;
export type ListProps = Omit<React.ComponentProps<typeof Epr.List>, "components"> & {
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
export type CategoryNavProps = React.ComponentProps<typeof Epr.CategoryNav> & {
  /** Classes for every tab (`data-slot="category-tab"`); the current one has data-active. */
  tabClassName?: string;
};
export type ViewportProps = React.ComponentProps<typeof Epr.Viewport>;

// Every part's root element carries a stable `data-slot`; style those, never the engine's markup.
export const Search = React.forwardRef<HTMLDivElement, SearchProps>(function Search({ inputProps, ...props }, ref) {
  const onResultsKey = useResultsKeyboard();
  const strip = React.useContext(StripNavContext);
  const results = useResults();
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    onResultsKey(e);
    // A horizontal List isn't one of the engine's regions: Down from the field enters it here.
    if (!e.defaultPrevented && e.key === "ArrowDown" && strip && !results?.active && !e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey && strip.focus()) e.preventDefault();
    if (!e.defaultPrevented) inputProps?.onKeyDown?.(e);
  };
  return <Epr.Search data-slot={SLOTS.search} {...props} ref={ref} inputProps={{ "data-slot": SLOTS.searchInput, ...inputProps, onKeyDown } as SearchProps["inputProps"]} />;
});
export const SearchInput = slotted(Epr.SearchInput, SLOTS.searchInput, "SearchInput");
const SlottedNav = slotted(Epr.CategoryNav, SLOTS.categoryNav, "CategoryNav");
export const CategoryNav = React.forwardRef<HTMLDivElement, CategoryNavProps>(function CategoryNav({ tabClassName, ...props }, ref) {
  const parent = React.useContext(NavContext);
  const value = React.useMemo(() => ({ ...parent, tabClassName }), [parent, tabClassName]);
  return (
    <NavContext.Provider value={value}>
      <SlottedNav {...props} ref={ref} />
    </NavContext.Provider>
  );
});
export const Viewport = slotted(Epr.Viewport, SLOTS.viewport, "Viewport");
export const List = React.forwardRef<HTMLUListElement, ListProps>(function List({ components, cellClassName, headerClassName, orientation = "vertical", rows = 5, searchRows, ...props }, ref) {
  const slots = React.useMemo(() => listSlots(components, { cell: cellClassName, header: headerClassName }), [components, cellClassName, headerClassName]);
  const results = useResults();
  const collapse = React.useContext(CollapseContext);
  if (orientation === "horizontal")
    // Our own renderer for both the categories and the results (one element, so it
    // keeps its state across search); collapse applies to categories only.
    return (
      <CollapseContext.Provider value={results?.active ? NoCollapse : collapse}>
        <StripList {...(props as React.HTMLAttributes<HTMLDivElement>)} ref={ref as unknown as React.Ref<HTMLDivElement>} rows={rows} searchRows={searchRows} cell={slots.Emoji!} header={slots.CategoryHeader!} />
      </CollapseContext.Provider>
    );
  // Search results ignore collapse.
  if (results?.active)
    return (
      <CollapseContext.Provider value={NoCollapse}>
        <ResultsList cell={slots.Emoji!} header={slots.CategoryHeader!} className={props.className} style={props.style} />
      </CollapseContext.Provider>
    );
  return <Epr.List data-slot={SLOTS.list} {...props} ref={ref} components={slots} />;
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
export const Reactions = slotted(Epr.Reactions, SLOTS.reactions, "Reactions");
export const Panel = slotted(Epr.Panel, SLOTS.panel, "Panel");
