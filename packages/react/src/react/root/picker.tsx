import * as React from "react";
import { type CategoryOption as CoreCategoryOption, createPickerState, type EmojiGridMove, type EmojiRecord, type EmojiSelection, isComposingKey, type PickerState, type PickerStateOptions } from "@brianhung/emoji-picker-core";
import { Autocomplete } from "react-aria-components/Autocomplete";
import { useCollapse } from "./collapse";
import { PickerContext, usePicker, ViewportContext, type EmojiPickerActions, type HighlightChangeDetails, type ListHandle, type PickerContextValue, type SearchResultsMode, type SelectDetails } from "./context";
import { useActiveWithin } from "../utils/hold";
import { mergeProps } from "react-aria/mergeProps";
import { useControlledState } from "react-stately/useControlledState";
import { mergeRefs } from "react-aria/mergeRefs";
import { hasModifier, usePickerKeyDown, type PickerKeyboardEventHandler } from "../utils/keyboard";
import { PopoverContext } from "../popover/popover-context";
import { EmojiContext, EmojiProvider, useEmojiContext } from "../provider/provider";
import { ReactionsContext, type ReactionsState } from "../reactions/reactions-context";
import { renderElement, resolve, type PartElementProps, type PartProps } from "../utils/render";
import { useClippedScrollGuard } from "../utils/scroll-guard";
import { shallowEqual, useStore } from "../utils/store";
import { SLOTS, VISUALLY_HIDDEN } from "../utils/slots";

export type CategoryOption = CoreCategoryOption<React.ReactNode>;

export type RootState = { searching: boolean; reactionsOpen: boolean };

export type RootProps = Omit<React.HTMLAttributes<HTMLElement>, "onSelect" | "children" | "role" | "onKeyDown" | "className" | "style" | "defaultValue"> &
  PartProps<RootState> & {
    onSelect?: (selection: EmojiSelection, details: SelectDetails) => void;
    onKeyDown?: PickerKeyboardEventHandler<HTMLElement>;
    actionsRef?: React.Ref<EmojiPickerActions>;
    keyboardTarget?: HTMLElement | React.RefObject<HTMLElement | null> | null;
    columns?: "fit" | number;
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
    highlight?: string | null;
    defaultHighlight?: string | null;
    onHighlightChange?: (emoji: string | null, details: HighlightChangeDetails) => void;
    reactions?: readonly string[];
    reactionsOpen?: boolean;
    defaultReactionsOpen?: boolean;
    onReactionsOpenChange?: (open: boolean) => void;
    emojiVersion?: number;
    disableVariations?: boolean;
    children: React.ReactNode;
  };

const VARIABLES = {
  "--ep-size": "var(--emoji-size, 30px)",
  "--ep-cell": "var(--emoji-cell-size, calc(var(--ep-size) + 10px))",
  "--ep-pad": "var(--emoji-list-padding, 10px)",
  "--ep-header": "var(--emoji-header-height, 40px)",
  "--ep-glyph-pad": "calc((var(--ep-cell) - var(--ep-size)) / 2)",
} as React.CSSProperties;

const PickerRoot = React.forwardRef<HTMLElement, RootProps>(function PickerRoot(props, ref) {
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
    searchResults = "ranked",
    searchLimit = 200,
    columns: columnsProp = "fit",
    className,
    style,
    render,
    onKeyDown,
    actionsRef,
    keyboardTarget,
    children,
    ...rest
  } = props;
  const { store, labels, maxVersion } = useEmojiContext();
  const columns = columnsProp === "fit" ? undefined : columnsProp;
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
  const [panels, setPanels] = React.useState(0);
  const registerPanel = React.useCallback(() => {
    setPanels((n) => n + 1);
    return () => setPanels((n) => n - 1);
  }, []);
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
  const skinTone = React.useRef<(() => void) | null>(null);
  const actions = React.useMemo<EmojiPickerActions>(
    () => ({
      move: (to) => Boolean(list.current?.move(to)),
      pick: () => Boolean(list.current?.pick()),
      highlight: (emoji) => (list.current ? list.current.highlight(emoji) : state.highlight(emoji)),
      focusSearch() {
        searchInput.current?.focus();
        return Boolean(searchInput.current);
      },
      clearSearch() {
        state.setQuery("");
        list.current?.clear();
      },
      close() {
        const { popover } = latest.current;
        popover?.close();
        return Boolean(popover);
      },
      toggleSkinTone() {
        skinTone.current?.();
        return Boolean(skinTone.current);
      },
    }),
    [state],
  );
  React.useImperativeHandle(actionsRef, () => actions, [actions]);
  const target = React.useCallback(() => (keyboardTarget && "current" in keyboardTarget ? keyboardTarget.current : keyboardTarget) ?? null, [keyboardTarget]);
  useKeyboardTarget(target, state, list);

  const context = React.useMemo<PickerContextValue>(
    () => ({
      store,
      state,
      labels,
      inPopover: Boolean(popover),
      disableVariations,
      columns,
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
      actions,
      ownsFocus: (el) => el != null && (el === searchInput.current || el === target()),
      target,
      skinTone,
      list,
      root: rootRef,
      searchInput,
      registerInput: state.registerInput,
      listId,
    }),
    [store, state, labels, popover, disableVariations, columns, emojiVersion, view, collapse, query, searching, searchResults, searchLimit, results, pending, value, pick, actions, target, listId],
  );
  const reactionsState = React.useMemo<ReactionsState | null>(
    () => (reactions ? { reactions: view.reactions ?? reactions, open: reactionsOpen, expand: panels ? () => setReactionsOpen(false) : undefined, panel, registerPanel } : null),
    [reactions, view.reactions, reactionsOpen, panels, setReactionsOpen, registerPanel],
  );

  const keys = usePickerKeyDown(onKeyDown, (e) => {
    if (e.key === "Escape") {
      if (!query) return Boolean(list.current?.clear()) || actions.close();
      actions.clearSearch();
      return true;
    }
    return e.key === "/" && !hasModifier(e) && !isTextField(e.target) && actions.focusSearch();
  });
  const count = !searching || pending ? "" : labels.resultCount(results.length);

  return renderElement(
    "aside",
    {
      ref: mergeRefs(ref, rootRef),
      "data-slot": SLOTS.root,
      "aria-label": rest["aria-labelledby"] ? undefined : labels.picker,
      ...mergeProps(rest, activeWithin),
      "data-columns": columns ?? undefined,
      "data-searching": searching ? "" : undefined,
      "data-reactions-open": reactionsOpen ? "" : undefined,
      onKeyDown: keys,
      className,
      style: (s: RootState) => ({ ...VARIABLES, ...(columns ? { "--ep-columns": columns } : {}), ...resolve(style, s) }) as React.CSSProperties,
      render,
      children: (
        <>
          <Autocomplete inputValue={query} onInputChange={state.setQuery}>
            <PickerContext.Provider value={context}>
              <ReactionsContext.Provider value={reactionsState}>{children}</ReactionsContext.Provider>
            </PickerContext.Provider>
          </Autocomplete>
          <span role="status" aria-live="polite" aria-atomic="true" data-slot={SLOTS.searchStatus} style={VISUALLY_HIDDEN}>
            {count}
          </span>
        </>
      ),
    },
    { searching, reactionsOpen },
  );
});

const isTextField = (el: EventTarget | null) =>
  el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !["button", "checkbox", "radio", "submit", "reset"].includes(el.type)) || (el instanceof HTMLElement && el.isContentEditable);

const TARGET_MOVES: Record<string, EmojiGridMove> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", PageUp: "page-up", PageDown: "page-down" };

function useKeyboardTarget(target: () => HTMLElement | null, state: PickerState<React.ReactNode>, list: React.RefObject<ListHandle | null>) {
  React.useEffect(() => {
    const el = target();
    if (!el) return;
    const unregister = state.registerInput();
    const onKeyDown = (event: KeyboardEvent) => {
      if (isComposingKey(event) || hasModifier(event)) return;
      const to = TARGET_MOVES[event.key];
      const handled = to ? list.current?.move(to, { reason: "keyboard", event }) : event.key === "Enter" && !event.shiftKey && list.current?.pick();
      if (!handled) return;
      event.preventDefault();
      // The editor's own keydown listeners on this element would move the caret too
      event.stopImmediatePropagation();
    };
    el.addEventListener("keydown", onKeyDown, true);
    return () => {
      el.removeEventListener("keydown", onKeyDown, true);
      unregister();
      el.removeAttribute("aria-activedescendant");
      el.removeAttribute("aria-controls");
    };
  }, [target, state, list]);
  useStore(state, (s) => (target() ? s.highlighted : null));
  React.useLayoutEffect(() => {
    const el = target();
    const ids = el && list.current?.ids();
    if (!el || !ids) return;
    el.setAttribute("aria-controls", ids.list);
    if (ids.active) el.setAttribute("aria-activedescendant", ids.active);
    else el.removeAttribute("aria-activedescendant");
  });
}

export const Root = React.forwardRef<HTMLElement, RootProps>(function Root(props, ref) {
  const root = <PickerRoot {...props} ref={ref} />;
  return React.useContext(EmojiContext) ? root : <EmojiProvider>{root}</EmojiProvider>;
});

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
  const keys = usePickerKeyDown(onKeyDown, () => false);
  return (
    <ViewportContext.Provider value={setOrientation}>
      {renderElement(
        "div",
        {
          "data-slot": SLOTS.viewport,
          "data-orientation": orientation,
          "data-searching": searching || undefined,
          ...props,
          ref,
          onKeyDown: keys,
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
