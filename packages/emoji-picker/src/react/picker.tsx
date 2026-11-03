import * as React from "react";
import { Autocomplete } from "react-aria-components";
import type { EmojiRecord } from "../core/dataset";
import type { EmojiSelection } from "../core/store";
import { CollapseContext, useCollapseState } from "./collapse";
import type { PickerComponents } from "./components";
import { PickerContext, signal, usePicker, useSignal, type FocusModel, type ListHandle, type PickerContextValue, type PointerModel, type SearchResultsMode, type SelectDetails } from "./context";
import { useEmojiSearchState, useFrequentEmoji, useSkinTone } from "./hooks";
import { useHeldWhileActive } from "./hold";
import { KeyboardProvider, mergeRefs, useUserKeyDown, type PickerKeyboardEventHandler } from "./keyboard";
import type { KeyboardAction } from "./keymap";
import { EmojiOverrides, type ArtworkMap } from "./overrides";
import { useEmojiPopover } from "./popover";
import { useEmojiContext, useStoreSnapshot } from "./provider";
import { ReactionsContext, type ReactionsState } from "./reactions";
import { useClippedScrollGuard } from "./scroll-guard";
import { categoryList, categorySections, itemFactory, type CategoryOption } from "./sections";
import { SkinToneButtonProvider } from "./skin-tone";
import { SLOTS, VISUALLY_HIDDEN, useStructureStyles } from "./slots";
import { EmptyStateContext, useEmptyStateSlots } from "./viewport";

export type { CategoryOption, FocusModel, PointerModel, SearchResultsMode, SelectDetails };

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
   * `event.preventEmojiPickerHandler()` to keep the picker (and React Aria) from handling it.
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
  /** Placeholder of the search input. Default: the provider's `labels.searchPlaceholder`. */
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
  /** Hide emoji added after this Unicode emoji version (e.g. 15.1), in the list and in search results. */
  emojiVersion?: number;
  /** Turn off skin-tone variations in the grid (Shift+Space and long press). */
  disableVariations?: boolean;
  components?: PickerComponents;
  /**
   * @deprecated The picker draws no colors of its own; use the tokens (`tokens.css`) or your
   * own CSS. Still sets `color-scheme` on Root.
   */
  colorScheme?: "light" | "dark" | "auto";
  nonce?: string;
  /**
   * Cascade layer for the structural CSS. Default "base": after Tailwind's preflight
   * and before its utilities, so classes and plain CSS override it with no setup.
   */
  cssLayer?: string;
  children: React.ReactNode;
};

type InternalRootProps = RootProps & {
  reactions?: readonly string[];
  reactionsDefaultOpen?: boolean;
  allowExpandReactions?: boolean;
  pressed?: ReadonlySet<string> | null;
};

const NO_COMPONENTS: PickerComponents = {};

export const PickerRoot = React.forwardRef<HTMLElement, InternalRootProps>(function PickerRoot(
  { onSelect, frequent = 16, suggested, emojiVersion: emojiVersionProp, categories: categoryOptions, collapsedCategories, defaultCollapsedCategories, onCollapsedCategoriesChange, search, defaultSearch, onSearchChange, disableVariations = false, reactions, reactionsDefaultOpen, allowExpandReactions = true, pressed = null, searchPlaceholder, searchResults = "ranked", searchLimit = 200, columns, components = NO_COMPONENTS, cssLayer = "base", nonce, colorScheme, style, autoFocusSearch, keymap, onKeyDown, onKeyDownCapture, focusModel = "input", pointer = "follows", artwork, children, ...rest },
  ref,
) {
  const { store, labels: providerLabels, groups, maxVersion } = useEmojiContext();
  const labels = React.useMemo(() => (searchPlaceholder ? { ...providerLabels, searchPlaceholder } : providerLabels), [providerLabels, searchPlaceholder]);
  // Inside an EmojiPopover: picking closes it (unless closeOnSelect={false}).
  const popover = useEmojiPopover();
  const status = useStoreSnapshot((s) => s.status());
  const [tone] = useSkinTone();
  // The renderer's limit (Twemoji's set) applies on top of the picker's own.
  const emojiVersion = maxVersion == null ? emojiVersionProp : Math.min(emojiVersionProp ?? Infinity, maxVersion);
  const rootRef = React.useRef<HTMLElement | null>(null);
  // Frequents change with every pick; held while the user is in the picker so
  // nothing moves under the pointer or the focused cell.
  const top = useHeldWhileActive(useFrequentEmoji(frequent || 1), rootRef);
  const heldReactions = useHeldWhileActive(reactions, rootRef);
  useClippedScrollGuard(rootRef);
  useStructureStyles(cssLayer, nonce);

  const collapse = useCollapseState(collapsedCategories, defaultCollapsedCategories, onCollapsedCategoriesChange);
  const groupNames = status === "ready" ? store.groupNames() : [];
  const categories = React.useMemo(() => categoryList(categoryOptions, groupNames, labels, [...groups.values()].filter((g): g is string => !!g)), [categoryOptions, groupNames, labels, groups]);
  const suggestedEmojis = React.useMemo(() => (suggested ?? (frequent === false ? [] : top)).map((u) => store.withSkinTone(u)), [suggested, frequent, top, store, tone]);
  const item = React.useMemo(() => itemFactory(labels), [labels]);
  const sections = React.useMemo(
    () =>
      status === "ready"
        ? categorySections({ categories, records: store.records(), suggested: suggestedEmojis, customGroup: (u) => groups.get(u), collapsed: collapse.isCollapsed, emojiVersion, get: store.get, withSkinTone: (u) => store.withSkinTone(u), item })
        : [],
    [status, categories, store, suggestedEmojis, groups, collapse, emojiVersion, tone, item],
  );

  const [ownQuery, setOwnQuery] = React.useState(defaultSearch ?? "");
  const query = search ?? ownQuery;
  const latestSearch = React.useRef(onSearchChange);
  latestSearch.current = onSearchChange;
  const setQuery = React.useCallback((value: string) => {
    setOwnQuery(value);
    latestSearch.current?.(value);
  }, []);
  const searchState = useEmojiSearchState(query, { limit: searchLimit });
  const results = React.useMemo(() => (emojiVersion == null ? searchState.results : searchState.results.filter((r) => r.imageUrl || r.version <= emojiVersion)), [searchState.results, emojiVersion]);
  const searching = query.trim().length > 0;

  const list = React.useRef<ListHandle | null>(null);
  const [activeSection] = React.useState(() => signal<string | null>(null));
  const [activeEmoji] = React.useState(() => signal<EmojiRecord | null>(null));
  const [searchCount, setSearchCount] = React.useState(0);
  // Assume a search field until mount shows there's none, so the list starts in the right focus mode.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const registerSearch = React.useCallback(() => {
    setSearchCount((n) => n + 1);
    return () => setSearchCount((n) => n - 1);
  }, []);
  const listId = React.useId();

  const [reactionsOpen, setReactionsOpen] = React.useState(Boolean(reactions && reactionsDefaultOpen !== false));
  const collapseToReactions = React.useCallback(() => setReactionsOpen(true), []);
  const latest = React.useRef({ onSelect, popover });
  latest.current = { onSelect, popover };
  const pick = React.useCallback(
    (unified: string, details: SelectDetails = {}) => {
      const selection = store.select(unified);
      if (!selection) return undefined;
      const { onSelect, popover } = latest.current;
      onSelect?.(selection, { collapse: reactions ? collapseToReactions : undefined, ...details });
      if (popover?.closeOnSelect) popover.close();
      return selection;
    },
    [store, reactions, collapseToReactions],
  );
  const close = React.useCallback(() => {
    const { popover } = latest.current;
    if (!popover) return false;
    popover.close();
    return true;
  }, []);

  const value = React.useMemo<PickerContextValue>(
    () => ({
      store,
      labels,
      focusModel,
      pointer,
      autoFocusSearch: autoFocusSearch ?? Boolean(popover),
      disableVariations,
      components,
      columns,
      emojiVersion,
      categories,
      categorySections: sections,
      collapse,
      query,
      setQuery,
      searching,
      searchResults,
      searchLimit,
      results,
      pending: searchState.pending,
      pick,
      close,
      list,
      activeSection,
      activeEmoji,
      hasSearch: searchCount > 0 || !mounted,
      registerSearch,
      listId,
      cellKey: (key) => `${listId}-${String(key)}`,
    }),
    [store, labels, focusModel, pointer, autoFocusSearch, popover, disableVariations, components, columns, emojiVersion, categories, sections, collapse, query, setQuery, searching, searchResults, searchLimit, results, searchState.pending, pick, close, activeSection, activeEmoji, searchCount, mounted, registerSearch, listId],
  );
  const reactionsState = React.useMemo<ReactionsState | null>(
    () => (reactions ? { reactions: heldReactions ?? reactions, open: reactionsOpen, expand: allowExpandReactions ? () => setReactionsOpen(false) : undefined, pressed } : null),
    [reactions, heldReactions, reactionsOpen, allowExpandReactions, pressed],
  );

  const escape = () => {
    if (query) {
      setQuery("");
      list.current?.clear();
      return true;
    }
    return Boolean(list.current?.clear()) || close();
  };
  const focusSearch = () => {
    const input = rootRef.current?.querySelector<HTMLElement>(`[data-slot="${SLOTS.searchInput}"]`);
    input?.focus();
    return Boolean(input);
  };
  const emptyState = useEmptyStateSlots();
  const count = !searching || searchState.pending ? "" : labels.resultCount(results.length);
  const body = (
    <PickerContext.Provider value={value}>
      <CollapseContext.Provider value={collapse}>
        <ReactionsContext.Provider value={reactionsState}>
          <EmptyStateContext.Provider value={emptyState}>
            <SkinToneButtonProvider value={components.SkinToneButton}>{artwork ? <EmojiOverrides artwork={artwork}>{children}</EmojiOverrides> : children}</SkinToneButtonProvider>
          </EmptyStateContext.Provider>
        </ReactionsContext.Provider>
      </CollapseContext.Provider>
    </PickerContext.Provider>
  );

  return (
    <KeyboardProvider keymap={keymap} onKeyDown={onKeyDown} close={escape} focusSearch={focusSearch} ownsKeys={(el) => Boolean(el.closest(`[role="tablist"], [role="toolbar"], [data-slot="${SLOTS.skinTone}"]`))}>
      {(keyboard) => (
        <aside
          ref={mergeRefs(ref, rootRef, keyboard.ref)}
          data-slot={SLOTS.root}
          // The root is an <aside> landmark, which needs a name; pass aria-label or aria-labelledby for another.
          aria-label={rest["aria-labelledby"] ? undefined : labels.picker}
          {...rest}
          data-columns={columns ?? undefined}
          data-search={searching ? "" : undefined}
          onKeyDownCapture={(e: React.KeyboardEvent<HTMLElement>) => {
            onKeyDownCapture?.(e);
            if (!e.isPropagationStopped()) keyboard.onKeyDownCapture(e);
          }}
          style={{ ...(columns ? { "--ep-columns": columns } : {}), ...(colorScheme ? { colorScheme: colorScheme === "auto" ? "light dark" : colorScheme } : {}), ...style } as React.CSSProperties}
        >
          {focusModel === "input" ? (
            <Autocomplete inputValue={query} onInputChange={setQuery} disableAutoFocusFirst>
              {body}
            </Autocomplete>
          ) : (
            body
          )}
          <span role="status" aria-live="polite" aria-atomic="true" data-slot={SLOTS.searchStatus} style={VISUALLY_HIDDEN}>
            {count}
          </span>
        </aside>
      )}
    </KeyboardProvider>
  );
});

export const Root = PickerRoot as React.ForwardRefExoticComponent<RootProps & React.RefAttributes<HTMLElement>>;

/** The hovered or highlighted emoji, resolved against the shared dataset. */
export function useActiveEmoji(): EmojiRecord | null {
  return useSignal(usePicker("useActiveEmoji").activeEmoji);
}

/** Sections that have a tab, the current one, and a jump to one (what CategoryNav uses). */
export function useCategoryNavigation() {
  const picker = usePicker("useCategoryNavigation");
  const activeCategory = useSignal(picker.activeSection);
  const categories = React.useMemo(() => {
    const shown = new Set(picker.categorySections.map((s) => s.id));
    return picker.categories.filter((c) => c.nav && shown.has(c.id)).map(({ id, name, icon }) => ({ id, name, icon }));
  }, [picker.categories, picker.categorySections]);
  const jumpToCategory = React.useCallback((id: string, options?: { instant?: boolean }) => picker.list.current?.jump(id, options), [picker.list]);
  return { categories, activeCategory: picker.searching ? null : activeCategory, jumpToCategory };
}

/** The applied query and how many results it shows (null while no query is applied). */
export function useSearchState(): { search: string; resultCount: number | null } {
  const picker = usePicker("useSearchState");
  return { search: picker.query, resultCount: picker.searching && !picker.pending ? picker.results.length : null };
}

/** Set or clear the query; clearing also returns focus to the search field. */
export function useSearchActions() {
  const { setQuery } = usePicker("useSearchActions");
  return React.useMemo(
    () => ({
      setValue: setQuery,
      clear: () => setQuery(""),
    }),
    [setQuery],
  );
}

export { useCollapsedCategories, type CollapsedCategories } from "./collapse";

export type ViewportProps = Omit<React.HTMLAttributes<HTMLDivElement>, "onKeyDown"> & {
  /** Runs before the picker handles the key; see Root's `onKeyDown`. */
  onKeyDown?: PickerKeyboardEventHandler<HTMLDivElement>;
};

/** The scroll container: holds one List, and Empty, Loading and LoadError (which the List shows when it has nothing). */
export const Viewport = React.forwardRef<HTMLDivElement, ViewportProps>(function Viewport({ onKeyDown, ...props }, ref) {
  const userKeys = useUserKeyDown(onKeyDown as PickerKeyboardEventHandler | undefined);
  const merged = React.useMemo(() => mergeRefs(ref, userKeys), [ref, userKeys]);
  return <div data-slot={SLOTS.viewport} {...props} ref={merged} />;
});

export type PreviewProps = React.HTMLAttributes<HTMLDivElement>;

/** The hovered or highlighted emoji with its name, or the caption when there's none. */
export const Preview = React.forwardRef<HTMLDivElement, PreviewProps>(function Preview({ children, ...props }, ref) {
  const { labels } = usePicker("EmojiPicker.Preview");
  const active = useActiveEmoji();
  return (
    <div data-slot={SLOTS.preview} {...props} ref={ref}>
      {children ?? (active ? `${active.imageUrl ? "" : active.emoji} ${active.name}`.trim() : labels.previewCaption)}
    </div>
  );
});
