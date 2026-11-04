import * as React from "react";
import type { EmojiRecord } from "../core/dataset";
import { createPickerState, type PickerStateOptions } from "../core/picker";
import type { CategoryOption as CoreCategoryOption } from "../core/sections";
import type { EmojiSelection } from "../core/store";
import { Autocomplete } from "react-aria-components/Autocomplete";
import { CollapseContext, useCollapse } from "./collapse";
import type { PickerComponents } from "./components";
import { PickerContext, usePicker, useSelector, type FocusModel, type HighlightControl, type ListHandle, type PickerContextValue, type PointerModel, type SearchResultsMode, type SelectDetails } from "./context";
import { useActiveWithin } from "./hold";
import { mergeRefs } from "react-aria/mergeRefs";
import { KeyboardProvider, useUserKeyDown, type PickerKeyboardEventHandler } from "./keyboard";
import type { KeyboardAction } from "./keymap";
import { EmojiOverrides, type ArtworkMap } from "./overrides";
import { useEmojiPopover } from "./popover-context";
import { useEmojiContext } from "./provider";
import { ReactionsContext, type ReactionsState } from "./reactions-context";
import { renderElement, resolve, type PartElementProps, type PartProps } from "./render";
import { useClippedScrollGuard } from "./scroll-guard";
import { SkinToneButtonProvider } from "./skin-tone";
import { SLOTS, VISUALLY_HIDDEN, useStructureStyles } from "./slots";
import { EmptyStateContext, useEmptyStateSlots } from "./viewport";

export type CategoryOption = CoreCategoryOption<React.ReactNode>;
export type { FocusModel, PointerModel, SearchResultsMode, SelectDetails };

export type RootState = { searching: boolean };

export type RootProps = Omit<React.HTMLAttributes<HTMLElement>, "onSelect" | "children" | "role" | "onKeyDown" | "className" | "style"> &
  PartProps<RootState> & {
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
  /**
   * With `columns`: false keeps that many per row even when the width is a little
   * short (the last column runs into the end padding, or under a scrollbar). Default
   * true: fewer columns when they don't fit.
   */
  fitColumns?: boolean;
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
  /** Turn off an emoji's skin-tone variations (Shift+Space and long press on it). */
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

export const PickerRoot = React.forwardRef<HTMLElement, InternalRootProps>(function PickerRoot(props, ref) {
  // The core state takes the props it knows by name (search, categories, frequent, collapse…).
  const { onSelect, frequent, suggested, emojiVersion: emojiVersionProp, categories, collapsedCategories, defaultCollapsedCategories, onCollapsedCategoriesChange, search, defaultSearch, onSearchChange, disableVariations = false, reactions, reactionsDefaultOpen, allowExpandReactions = true, pressed = null, searchPlaceholder, searchResults = "ranked", searchLimit = 200, columns, fitColumns = true, components = NO_COMPONENTS, cssLayer = "base", nonce, colorScheme, className, style, render, autoFocusSearch, keymap, onKeyDown, onKeyDownCapture, focusModel = "input", pointer = "follows", artwork, children, ...rest } = props;
  const { store, labels: providerLabels, maxVersion } = useEmojiContext();
  const labels = React.useMemo(() => (searchPlaceholder ? { ...providerLabels, searchPlaceholder } : providerLabels), [providerLabels, searchPlaceholder]);
  // Inside an EmojiPopover: picking closes it (unless closeOnSelect={false}).
  const popover = useEmojiPopover();
  // The renderer's limit (Twemoji's set) applies on top of the picker's own.
  const emojiVersion = maxVersion == null ? emojiVersionProp : Math.min(emojiVersionProp ?? Infinity, maxVersion);
  const rootRef = React.useRef<HTMLElement | null>(null);
  const base: PickerStateOptions<React.ReactNode> = { ...props, labels, emojiVersion };
  const control = React.useRef<HighlightControl | null>(null);
  const options = { ...base, ...control.current };
  const [state] = React.useState(() => createPickerState(store, options));
  state.setOptions(options);
  const latestBase = React.useRef(base);
  latestBase.current = base;
  const controlHighlight = React.useCallback(
    (next: HighlightControl | null) => {
      control.current = next;
      state.setOptions({ ...latestBase.current, ...next }, { notify: true });
    },
    [state],
  );
  const view = useSelector(state, ({ query, searching, results, pending, categories, categorySections, sections, collapsed, focus, reactions }) => ({ query, searching, results, pending, categories, categorySections, sections, collapsed, focus, reactions }));
  React.useEffect(() => void state.mount(), [state]);
  // Frequents change with every pick; held while the user is in the picker so
  // nothing moves under the pointer or the focused cell.
  useActiveWithin(rootRef, state.hold);
  useClippedScrollGuard(rootRef);
  useStructureStyles(cssLayer, nonce);

  const collapse = useCollapse(state, view.collapsed);
  const { query, searching, results, pending } = view;
  const list = React.useRef<ListHandle | null>(null);
  const listId = React.useId();

  const [reactionsOpen, setReactionsOpen] = React.useState(Boolean(reactions && reactionsDefaultOpen !== false));
  const collapseToReactions = React.useCallback(() => setReactionsOpen(true), []);
  const latest = React.useRef({ onSelect, popover });
  latest.current = { onSelect, popover };
  const pick = React.useCallback(
    (unified: string, details: SelectDetails = {}) => {
      const selection = state.choose(unified);
      if (!selection) return undefined;
      const { onSelect, popover } = latest.current;
      onSelect?.(selection, { collapse: reactions ? collapseToReactions : undefined, ...details });
      if (popover?.closeOnSelect) popover.close();
      return selection;
    },
    [state, reactions, collapseToReactions],
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
      state,
      labels,
      focusModel,
      pointer,
      autoFocusSearch: autoFocusSearch ?? Boolean(popover),
      disableVariations,
      components,
      columns,
      fitColumns,
      emojiVersion,
      categories: view.categories,
      categorySections: view.categorySections,
      sections: view.sections,
      collapse,
      query,
      setQuery: state.setQuery,
      searching,
      searchResults,
      searchLimit,
      results,
      pending,
      virtual: view.focus === "virtual",
      pick,
      close,
      list,
      registerSearch: state.registerSearch,
      controlHighlight,
      listId,
    }),
    [store, state, controlHighlight, labels, focusModel, pointer, autoFocusSearch, popover, disableVariations, components, columns, fitColumns, emojiVersion, view, collapse, query, searching, searchResults, searchLimit, results, pending, pick, close, listId],
  );
  const reactionsState = React.useMemo<ReactionsState | null>(
    () => (reactions ? { reactions: view.reactions ?? reactions, open: reactionsOpen, expand: allowExpandReactions ? () => setReactionsOpen(false) : undefined, pressed } : null),
    [reactions, view.reactions, reactionsOpen, allowExpandReactions, pressed],
  );

  const escape = () => {
    if (query) {
      state.setQuery("");
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
  const count = !searching || pending ? "" : labels.resultCount(results.length);
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
    <KeyboardProvider keymap={keymap} onKeyDown={onKeyDown} close={escape} focusSearch={focusSearch} variations={(target) => Boolean(list.current?.variations(target))} ownsKeys={(el) => Boolean(el.closest(`[role="tablist"], [role="toolbar"], [data-slot="${SLOTS.skinTone}"]`))}>
      {(keyboard) => (
        renderElement(
          "aside",
          {
            ref: mergeRefs(ref, rootRef, keyboard.ref),
            "data-slot": SLOTS.root,
            // The root is an <aside> landmark, which needs a name; pass aria-label or aria-labelledby for another.
            "aria-label": rest["aria-labelledby"] ? undefined : labels.picker,
            ...rest,
            "data-columns": columns ?? undefined,
            "data-search": searching ? "" : undefined,
            onKeyDownCapture: (e: React.KeyboardEvent<HTMLElement>) => {
              onKeyDownCapture?.(e);
              if (!e.isPropagationStopped()) keyboard.onKeyDownCapture(e);
            },
            className,
            style: (s: RootState) => ({ ...(columns ? { "--ep-columns": columns } : {}), ...(colorScheme ? { colorScheme: colorScheme === "auto" ? "light dark" : colorScheme } : {}), ...resolve(style, s) }) as React.CSSProperties,
            render,
            children: (
              <>
                {focusModel === "input" ? (
                  <Autocomplete inputValue={query} onInputChange={state.setQuery} disableAutoFocusFirst>
                    {body}
                  </Autocomplete>
                ) : (
                  body
                )}
                <span role="status" aria-live="polite" aria-atomic="true" data-slot={SLOTS.searchStatus} style={VISUALLY_HIDDEN}>
                  {count}
                </span>
              </>
            ),
          },
          { searching },
        )
      )}
    </KeyboardProvider>
  );
});

export const Root = PickerRoot as React.ForwardRefExoticComponent<RootProps & React.RefAttributes<HTMLElement>>;

/** The hovered or highlighted emoji, resolved against the shared dataset. */
export function useActiveEmoji(): EmojiRecord | null {
  return useSelector(usePicker("useActiveEmoji").state, (s) => s.active?.record ?? null);
}

/** Sections that have a tab, the current one, and a jump to one (what CategoryNav uses). */
export function useCategoryNavigation() {
  const picker = usePicker("useCategoryNavigation");
  const activeCategory = useSelector(picker.state, (s) => s.activeSection);
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

export type ViewportState = { searching: boolean };

export type ViewportProps = PartElementProps<ViewportState, HTMLDivElement, "onKeyDown"> & {
  /** Runs before the picker handles the key; see Root's `onKeyDown`. */
  onKeyDown?: PickerKeyboardEventHandler<HTMLDivElement>;
};

/** The scroll container: holds one List, and Empty, Loading and LoadError (which the List shows when it has nothing). */
export const Viewport = React.forwardRef<HTMLDivElement, ViewportProps>(function Viewport({ onKeyDown, ...props }, ref) {
  const { searching } = usePicker("EmojiPicker.Viewport");
  const userKeys = useUserKeyDown(onKeyDown as PickerKeyboardEventHandler | undefined);
  const merged = React.useMemo(() => mergeRefs(ref, userKeys), [ref, userKeys]);
  return renderElement("div", { "data-slot": SLOTS.viewport, ...props, ref: merged }, { searching });
});

export type PreviewState = { emoji: EmojiRecord | null };

export type PreviewProps = PartElementProps<PreviewState>;

/** The hovered or highlighted emoji with its name, or the caption when there's none. */
export const Preview = React.forwardRef<HTMLDivElement, PreviewProps>(function Preview({ children, ...props }, ref) {
  const { labels } = usePicker("EmojiPicker.Preview");
  const active = useActiveEmoji();
  const caption = active ? `${active.imageUrl ? "" : active.emoji} ${active.name}`.trim() : labels.previewCaption;
  return renderElement("div", { "data-slot": SLOTS.preview, ...props, ref, children: children ?? caption }, { emoji: active });
});
