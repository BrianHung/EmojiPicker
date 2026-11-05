import * as React from "react";
import type { EmojiRecord } from "../core/dataset";
import { createPickerState, type PickerStateOptions } from "../core/picker";
import type { CategoryOption as CoreCategoryOption } from "../core/sections";
import type { EmojiSelection } from "../core/store";
import { Autocomplete } from "react-aria-components/Autocomplete";
import { CollapseContext, useCollapse } from "./collapse";
import { PickerContext, usePicker, useSelector, ViewportContext, type FocusModel, type ListHandle, type PickerContextValue, type PointerModel, type SearchResultsMode, type SelectDetails } from "./context";
import { useActiveWithin } from "./hold";
import { mergeRefs } from "react-aria/mergeRefs";
import { KeyboardProvider, useUserKeyDown, type PickerKeyboardEventHandler } from "./keyboard";
import type { KeyboardAction } from "./keymap";
import { useEmojiPopover } from "./popover-context";
import { useEmojiContext } from "./provider";
import { ReactionsContext, type ReactionsState } from "./reactions-context";
import { renderElement, resolve, type PartElementProps, type PartProps } from "./render";
import { useClippedScrollGuard } from "./scroll-guard";
import { SLOTS, VISUALLY_HIDDEN } from "./slots";
import { EmptyStateContext, useEmptyStateSlots } from "./viewport";

export type CategoryOption = CoreCategoryOption<React.ReactNode>;
export type { FocusModel, PointerModel, SearchResultsMode, SelectDetails };

export type RootState = { searching: boolean; reactionsOpen: boolean };

export type RootProps = Omit<React.HTMLAttributes<HTMLElement>, "onSelect" | "children" | "role" | "onKeyDown" | "className" | "style" | "defaultValue"> &
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
     * come from the provider's `searchEngine`. Default "ranked".
     */
    searchResults?: SearchResultsMode;
    /** Most results to show for a query. Default 200. */
    searchLimit?: number;
    /** The search text, controlled. */
    query?: string;
    defaultQuery?: string;
    onQueryChange?: (query: string) => void;
    /** A value picker (a page icon): the emoji shown as chosen (`aria-selected`), compared without skin tone; null for none. Controlled. */
    value?: string | null;
    defaultValue?: string | null;
    onValueChange?: (unified: string) => void;
    /** The keyboard position: an item id (`EmojiItem.id`, "smileys_people:1f600"), or null. Controlled. */
    highlightedEmoji?: string | null;
    defaultHighlightedEmoji?: string | null;
    onHighlightedEmojiChange?: (id: string | null) => void;
    /** The emoji (unified codes) of `EmojiPicker.Reactions`. */
    reactions?: readonly string[];
    /** The reaction row shows, rather than the full picker in `EmojiPicker.Panel`. Controlled. */
    reactionsOpen?: boolean;
    /** Default true. */
    defaultReactionsOpen?: boolean;
    onReactionsOpenChange?: (open: boolean) => void;
    /** Where focus lives while navigating: "input" (default; a highlight moves, focus stays in search) or "grid" (focus moves into the cells). */
    focusModel?: FocusModel;
    /** "follows" (default): hover moves the keyboard position. "independent": hover is only a style. */
    pointer?: PointerModel;
    /** Hide emoji added after this Unicode emoji version (e.g. 15.1), in the list and in search results. */
    emojiVersion?: number;
    /** Turn off an emoji's skin-tone variations (Shift+Space and long press on it). */
    disableVariations?: boolean;
    children: React.ReactNode;
  };

type InternalRootProps = RootProps & {
  allowExpandReactions?: boolean;
  pressed?: ReadonlySet<string> | null;
};

const VARIABLES = {
  "--ep-size": "var(--emoji-size, 30px)",
  "--ep-cell": "var(--emoji-cell-size, calc(var(--ep-size) + 10px))",
  "--ep-pad": "var(--emoji-list-padding, 10px)",
  "--ep-header": "var(--emoji-header-height, 40px)",
  "--ep-glyph-pad": "calc((var(--ep-cell) - var(--ep-size)) / 2)",
} as React.CSSProperties;

/** A controlled value, or its own state seeded with the default; the setter calls `onChange` either way. */
function useControllable<T, Next extends T = T>(controlled: T | undefined, initial: T, onChange: ((value: Next) => void) | undefined): [T, (value: Next) => void] {
  const [own, setOwn] = React.useState(initial);
  const latest = React.useRef({ controlled: controlled !== undefined, onChange });
  latest.current = { controlled: controlled !== undefined, onChange };
  const set = React.useCallback((value: Next) => {
    if (!latest.current.controlled) setOwn(value);
    latest.current.onChange?.(value);
  }, []);
  return [controlled === undefined ? own : controlled, set];
}

export const PickerRoot = React.forwardRef<HTMLElement, InternalRootProps>(function PickerRoot(props, ref) {
  // The core state takes the props it knows by name (query, categories, frequent, collapse…).
  const { onSelect, frequent, suggested, emojiVersion: emojiVersionProp, categories, collapsedCategories, defaultCollapsedCategories, onCollapsedCategoriesChange, query: _query, defaultQuery, onQueryChange, value: valueProp, defaultValue, onValueChange, highlightedEmoji, defaultHighlightedEmoji, onHighlightedEmojiChange, disableVariations = false, reactions, reactionsOpen: reactionsOpenProp, defaultReactionsOpen = true, onReactionsOpenChange, allowExpandReactions = true, pressed = null, searchResults = "ranked", searchLimit = 200, columns, fitColumns = true, className, style, render, keymap, onKeyDown, onKeyDownCapture, focusModel = "input", pointer = "follows", children, ...rest } = props;
  const { store, labels, maxVersion } = useEmojiContext();
  // Inside an EmojiPopover: picking closes it (unless closeOnSelect={false}).
  const popover = useEmojiPopover();
  // The renderer's limit (Twemoji's set) applies on top of the picker's own.
  const emojiVersion = maxVersion == null ? emojiVersionProp : Math.min(emojiVersionProp ?? Infinity, maxVersion);
  const rootRef = React.useRef<HTMLElement | null>(null);
  const options: PickerStateOptions<React.ReactNode> = { ...props, labels, emojiVersion, highlighted: highlightedEmoji, defaultHighlighted: defaultHighlightedEmoji, onHighlightChange: onHighlightedEmojiChange };
  const [state] = React.useState(() => createPickerState(store, options));
  state.setOptions(options);
  const view = useSelector(state, ({ query, searching, results, pending, categories, categorySections, sections, collapsed, focus, reactions }) => ({ query, searching, results, pending, categories, categorySections, sections, collapsed, focus, reactions }));
  React.useEffect(() => void state.mount(), [state]);
  // Frequents change with every pick; held while the user is in the picker so
  // nothing moves under the pointer or the focused cell.
  useActiveWithin(rootRef, state.hold);
  useClippedScrollGuard(rootRef);

  const collapse = useCollapse(state, view.collapsed);
  const { query, searching, results, pending } = view;
  const list = React.useRef<ListHandle | null>(null);
  const listId = React.useId();

  const [value, setValue] = useControllable<string | null | undefined, string>(valueProp, defaultValue, onValueChange);
  const [open, setReactionsOpen] = useControllable(reactionsOpenProp, defaultReactionsOpen, onReactionsOpenChange);
  const reactionsOpen = Boolean(reactions) && open;
  const collapseToReactions = React.useCallback(() => setReactionsOpen(true), [setReactionsOpen]);
  const latest = React.useRef({ onSelect, popover, selects: value !== undefined });
  latest.current = { onSelect, popover, selects: value !== undefined };
  const pick = React.useCallback(
    (unified: string, details: SelectDetails = {}) => {
      const selection = state.choose(unified);
      if (!selection) return undefined;
      const { onSelect, popover, selects } = latest.current;
      if (selects) setValue(selection.unified);
      onSelect?.(selection, { collapse: reactions ? collapseToReactions : undefined, ...details });
      if (popover?.closeOnSelect) popover.close("select");
      return selection;
    },
    [state, reactions, collapseToReactions, setValue],
  );
  const close = React.useCallback(() => {
    const { popover } = latest.current;
    if (!popover) return false;
    popover.close();
    return true;
  }, []);

  const context = React.useMemo<PickerContextValue>(
    () => ({
      store,
      state,
      labels,
      focusModel,
      pointer,
      inPopover: Boolean(popover),
      disableVariations,
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
      value,
      virtual: view.focus === "virtual",
      pick,
      close,
      list,
      registerSearch: state.registerSearch,
      listId,
    }),
    [store, state, labels, focusModel, pointer, popover, disableVariations, columns, fitColumns, emojiVersion, view, collapse, query, searching, searchResults, searchLimit, results, pending, value, pick, close, listId],
  );
  const reactionsState = React.useMemo<ReactionsState | null>(
    () => (reactions ? { reactions: view.reactions ?? reactions, open: reactionsOpen, expand: allowExpandReactions ? () => setReactionsOpen(false) : undefined, pressed } : null),
    [reactions, view.reactions, reactionsOpen, allowExpandReactions, pressed, setReactionsOpen],
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
    <PickerContext.Provider value={context}>
      <CollapseContext.Provider value={collapse}>
        <ReactionsContext.Provider value={reactionsState}>
          <EmptyStateContext.Provider value={emptyState}>{children}</EmptyStateContext.Provider>
        </ReactionsContext.Provider>
      </CollapseContext.Provider>
    </PickerContext.Provider>
  );

  return (
    <KeyboardProvider keymap={keymap} onKeyDown={onKeyDown} close={escape} focusSearch={focusSearch} variations={(target) => Boolean(list.current?.variations(target))} ownsKeys={(el) => Boolean(el.closest(`[role="tablist"], [role="toolbar"], [data-slot="${SLOTS.skinTone}"]`))}>
      {(keyboard) =>
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
            "data-reactions-open": reactionsOpen ? "" : undefined,
            onKeyDownCapture: (e: React.KeyboardEvent<HTMLElement>) => {
              onKeyDownCapture?.(e);
              if (!e.isPropagationStopped()) keyboard.onKeyDownCapture(e);
            },
            className,
            style: (s: RootState) => ({ ...VARIABLES, ...(columns ? { "--ep-columns": columns } : {}), ...resolve(style, s) }) as React.CSSProperties,
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
          { searching, reactionsOpen },
        )
      }
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
export function useSearchState(): { query: string; resultCount: number | null } {
  const picker = usePicker("useSearchState");
  return { query: picker.query, resultCount: picker.searching && !picker.pending ? picker.results.length : null };
}

export { useCollapsedCategories, type CollapsedCategories } from "./collapse";

type Orientation = "vertical" | "horizontal";

export type ViewportState = { searching: boolean; orientation: Orientation };

export type ViewportProps = PartElementProps<ViewportState, HTMLDivElement, "onKeyDown"> & {
  /** Runs before the picker handles the key; see Root's `onKeyDown`. */
  onKeyDown?: PickerKeyboardEventHandler<HTMLDivElement>;
};

const SCROLL: Record<Orientation, React.CSSProperties> = {
  vertical: { overflowX: "hidden", overflowY: "scroll", overscrollBehavior: "contain" },
  horizontal: { overflowX: "auto", overflowY: "hidden", overscrollBehavior: "contain" },
};
/** With `columns`, a scrollbar appearing never takes a column. */
const FIXED_GUTTER: React.CSSProperties = { scrollbarGutter: "stable" };

/** The scroll container: holds one List, and Empty, Loading and LoadError (which the List shows when it has nothing). */
export const Viewport = React.forwardRef<HTMLDivElement, ViewportProps>(function Viewport({ onKeyDown, style, ...props }, ref) {
  const { searching, columns } = usePicker("EmojiPicker.Viewport");
  const [orientation, setOrientation] = React.useState<Orientation>("vertical");
  const userKeys = useUserKeyDown(onKeyDown as PickerKeyboardEventHandler | undefined);
  const merged = React.useMemo(() => mergeRefs(ref, userKeys), [ref, userKeys]);
  return (
    <ViewportContext.Provider value={setOrientation}>
      {renderElement("div", { "data-slot": SLOTS.viewport, "data-orientation": orientation, ...props, ref: merged, style: (s: ViewportState) => ({ ...SCROLL[s.orientation], ...(columns ? FIXED_GUTTER : null), ...resolve(style, s) }) }, { searching, orientation })}
    </ViewportContext.Provider>
  );
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
