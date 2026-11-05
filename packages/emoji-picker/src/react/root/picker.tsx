import * as React from "react";
import { type CategoryOption as CoreCategoryOption, createPickerState, type EmojiRecord, type EmojiSelection, type PickerStateOptions } from "@brianhung/emoji-picker-core";
import { Autocomplete } from "react-aria-components/Autocomplete";
import { CollapseContext, useCollapse } from "./collapse";
import { PickerContext, usePicker, ViewportContext, type FocusModel, type ListHandle, type PickerContextValue, type PointerModel, type SearchResultsMode, type SelectDetails } from "./context";
import { useActiveWithin } from "../utils/hold";
import { mergeProps } from "react-aria/mergeProps";
import { useControlledState } from "react-stately/useControlledState";
import { mergeRefs } from "react-aria/mergeRefs";
import { KeyboardProvider, useUserKeyDown, type PickerKeyboardEventHandler } from "./keyboard";
import type { KeyboardAction } from "./keymap";
import { PopoverContext } from "../popover/popover-context";
import { useEmojiContext } from "../provider/provider";
import { ReactionsContext, type ReactionsState } from "../reactions/reactions-context";
import { renderElement, resolve, type PartElementProps, type PartProps } from "../utils/render";
import { useClippedScrollGuard } from "../utils/scroll-guard";
import { shallowEqual, useStore } from "../utils/store";
import { SLOTS, VISUALLY_HIDDEN } from "../utils/slots";
import { EmptyStateContext, useEmptyStateSlots } from "./viewport";

export type CategoryOption = CoreCategoryOption<React.ReactNode>;

export type RootState = { searching: boolean; reactionsOpen: boolean };

export type RootProps = Omit<React.HTMLAttributes<HTMLElement>, "onSelect" | "children" | "role" | "onKeyDown" | "className" | "style" | "defaultValue"> &
  PartProps<RootState> & {
    onSelect?: (selection: EmojiSelection, details: SelectDetails) => void;
    keymap?: Partial<Record<KeyboardAction, readonly string[]>>;
    onKeyDown?: PickerKeyboardEventHandler<HTMLElement>;
    columns?: number;
    fitColumns?: boolean;
    categories?: readonly CategoryOption[];
    frequent?: number | false;
    collapsedCategories?: readonly string[];
    defaultCollapsedCategories?: readonly string[];
    onCollapsedCategoriesChange?: (ids: readonly string[]) => void;
    suggested?: readonly string[];
    searchResults?: SearchResultsMode;
    searchLimit?: number;
    query?: string;
    defaultQuery?: string;
    onQueryChange?: (query: string) => void;
    value?: string | null;
    defaultValue?: string | null;
    onValueChange?: (unified: string) => void;
    highlighted?: string | null;
    defaultHighlighted?: string | null;
    onHighlightedChange?: (id: string | null) => void;
    reactions?: readonly string[];
    reactionsOpen?: boolean;
    defaultReactionsOpen?: boolean;
    onReactionsOpenChange?: (open: boolean) => void;
    focusModel?: FocusModel;
    pointerModel?: PointerModel;
    emojiVersion?: number;
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

export const PickerRoot = React.forwardRef<HTMLElement, InternalRootProps>(function PickerRoot(props, ref) {
  const {
    onSelect,
    frequent,
    suggested,
    emojiVersion: emojiVersionProp,
    categories,
    collapsedCategories,
    defaultCollapsedCategories,
    onCollapsedCategoriesChange,
    query: _query,
    defaultQuery,
    onQueryChange,
    value: valueProp,
    defaultValue,
    onValueChange,
    disableVariations = false,
    reactions,
    reactionsOpen: reactionsOpenProp,
    defaultReactionsOpen = true,
    onReactionsOpenChange,
    allowExpandReactions = true,
    pressed = null,
    searchResults = "ranked",
    searchLimit = 200,
    columns,
    fitColumns = true,
    className,
    style,
    render,
    keymap,
    onKeyDown,
    onKeyDownCapture,
    focusModel = "input",
    pointerModel = "follows",
    children,
    ...rest
  } = props;
  const { store, labels, maxVersion } = useEmojiContext();
  const popover = React.useContext(PopoverContext);
  const emojiVersion = maxVersion == null ? emojiVersionProp : Math.min(emojiVersionProp ?? Infinity, maxVersion);
  const rootRef = React.useRef<HTMLElement | null>(null);
  const options: PickerStateOptions<React.ReactNode> = { ...props, labels, emojiVersion };
  const [state] = React.useState(() => createPickerState(store, options));
  state.setOptions(options);
  const view = useStore(
    state,
    ({ query, searching, results, pending, categories, categorySections, sections, collapsed, focus, reactions }) => ({ query, searching, results, pending, categories, categorySections, sections, collapsed, focus, reactions }),
    shallowEqual,
  );
  React.useEffect(() => void state.mount(), [state]);
  const activeWithin = useActiveWithin(state.hold);
  useClippedScrollGuard(rootRef);

  const collapse = useCollapse(state, view.collapsed);
  const { query, searching, results, pending } = view;
  const list = React.useRef<ListHandle | null>(null);
  const searchInput = React.useRef<HTMLInputElement | null>(null);
  const panel = React.useRef<HTMLDivElement | null>(null);
  const listId = React.useId();

  const [value, setValue] = useControlledState<string | null | undefined, string>(valueProp as string | null, defaultValue, onValueChange);
  const [open, setReactionsOpen] = useControlledState(reactionsOpenProp, defaultReactionsOpen, onReactionsOpenChange);
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
      pointer: pointerModel,
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
      root: rootRef,
      searchInput,
      registerSearch: state.registerSearch,
      listId,
    }),
    [store, state, labels, focusModel, pointerModel, popover, disableVariations, columns, fitColumns, emojiVersion, view, collapse, query, searching, searchResults, searchLimit, results, pending, value, pick, close, listId],
  );
  const reactionsState = React.useMemo<ReactionsState | null>(
    () => (reactions ? { reactions: view.reactions ?? reactions, open: reactionsOpen, expand: allowExpandReactions ? () => setReactionsOpen(false) : undefined, pressed, panel } : null),
    [reactions, view.reactions, reactionsOpen, allowExpandReactions, pressed, setReactionsOpen],
  );

  const onEscape = () => {
    if (query) {
      state.setQuery("");
      list.current?.clear();
      return true;
    }
    return Boolean(list.current?.clear()) || close();
  };
  const focusSearch = () => {
    searchInput.current?.focus();
    return Boolean(searchInput.current);
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
    <KeyboardProvider
      keymap={keymap}
      onKeyDown={onKeyDown}
      close={onEscape}
      focusSearch={focusSearch}
      variations={(target) => Boolean(list.current?.variations(target))}
      // Composite widgets own their arrow keys, including ones the app renders inside the picker
      ownsKeys={(el) => Boolean(el.closest(`[role="tablist"], [role="toolbar"], [data-slot="${SLOTS.skinTone}"]`))}
    >
      {(keyboard) =>
        renderElement(
          "aside",
          {
            ref: mergeRefs(ref, rootRef, keyboard.ref),
            "data-slot": SLOTS.root,
            "aria-label": rest["aria-labelledby"] ? undefined : labels.picker,
            ...mergeProps(rest, activeWithin),
            "data-columns": columns ?? undefined,
            "data-searching": searching ? "" : undefined,
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
                  <Autocomplete inputValue={query} onInputChange={state.setQuery}>
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

export function useActiveEmoji(): EmojiRecord | null {
  return useStore(usePicker("useActiveEmoji").state, (s) => s.active?.record ?? null);
}

export function useCategoryNavigation() {
  const picker = usePicker("useCategoryNavigation");
  const activeCategory = useStore(picker.state, (s) => s.activeSection);
  const categories = React.useMemo(() => {
    const shown = new Set(picker.categorySections.map((s) => s.id));
    return picker.categories.filter((c) => c.nav && shown.has(c.id)).map(({ id, name, icon }) => ({ id, name, icon }));
  }, [picker.categories, picker.categorySections]);
  const jumpToCategory = React.useCallback((id: string, options?: { instant?: boolean }) => picker.list.current?.jump(id, options), [picker.list]);
  return { categories, activeCategory: picker.searching ? null : activeCategory, jumpToCategory };
}

export function useSearchState(): { query: string; resultCount: number | null } {
  const picker = usePicker("useSearchState");
  return { query: picker.query, resultCount: picker.searching && !picker.pending ? picker.results.length : null };
}

type Orientation = "vertical" | "horizontal";

export type ViewportState = { searching: boolean; orientation: Orientation };

export type ViewportProps = PartElementProps<ViewportState, HTMLDivElement, "onKeyDown"> & {
  onKeyDown?: PickerKeyboardEventHandler<HTMLDivElement>;
};

const SCROLL: Record<Orientation, React.CSSProperties> = {
  vertical: { overflowX: "hidden", overflowY: "scroll", overscrollBehavior: "contain" },
  horizontal: { overflowX: "auto", overflowY: "hidden", overscrollBehavior: "contain" },
};
const FIXED_GUTTER: React.CSSProperties = { scrollbarGutter: "stable" };

export const Viewport = React.forwardRef<HTMLDivElement, ViewportProps>(function Viewport({ onKeyDown, style, ...props }, ref) {
  const { searching, columns } = usePicker("EmojiPicker.Viewport");
  const [orientation, setOrientation] = React.useState<Orientation>("vertical");
  const userKeys = useUserKeyDown(onKeyDown as PickerKeyboardEventHandler | undefined);
  const merged = React.useMemo(() => mergeRefs<HTMLDivElement>(ref, userKeys), [ref, userKeys]);
  return (
    <ViewportContext.Provider value={setOrientation}>
      {renderElement(
        "div",
        {
          "data-slot": SLOTS.viewport,
          "data-orientation": orientation,
          "data-searching": searching || undefined,
          ...props,
          ref: merged,
          style: (s: ViewportState) => ({ ...SCROLL[s.orientation], ...(columns ? FIXED_GUTTER : null), ...resolve(style, s) }),
        },
        { searching, orientation },
      )}
    </ViewportContext.Provider>
  );
});

export type PreviewState = { emoji: EmojiRecord | null };

export type PreviewProps = PartElementProps<PreviewState>;

export const Preview = React.forwardRef<HTMLDivElement, PreviewProps>(function Preview({ children, ...props }, ref) {
  const { labels } = usePicker("EmojiPicker.Preview");
  const active = useActiveEmoji();
  const caption = active ? `${active.imageUrl ? "" : active.emoji} ${active.name}`.trim() : labels.previewCaption;
  return renderElement("div", { "data-slot": SLOTS.preview, ...props, ref, children: children ?? caption }, { emoji: active });
});
