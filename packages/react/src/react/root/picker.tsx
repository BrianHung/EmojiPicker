import * as React from "react";
import { createChangeDetails, type EmojiRecord, type EmojiSelection, isComposingKey } from "@brianhung/emoji-picker-core";
import { Autocomplete } from "react-aria-components/Autocomplete";
import type { EmojiGridMove } from "../state/grid";
import { type CollapsedCategoriesChangeDetails as CoreCollapsedCategoriesChangeDetails, createPickerState, type PickerState, type PickerStateOptions, type QueryChangeDetails as CoreQueryChangeDetails } from "../state/picker";
import type { CategoryOption as CoreCategoryOption } from "../state/sections";
import { useCollapse } from "./collapse";
import {
  PickerContext,
  usePicker,
  ViewportContext,
  type EmojiPickerActions,
  type HighlightChangeDetails as CoreHighlightChangeDetails,
  type ListHandle,
  type PickerContextValue,
  type ReactionsOpenChangeDetails as RootReactionsOpenChangeDetails,
  type SearchResultsMode,
  type SelectDetails as RootSelectDetails,
  type SelectReason,
  type ValueChangeDetails as RootValueChangeDetails,
} from "./context";
import { useActiveWithin } from "../utils/hold";
import { useChangeState } from "../utils/state";
import { mergeRefs } from "react-aria/mergeRefs";
import { mergePartProps, type PickerHandlers } from "../utils/events";
import { hasModifier, usePickerKeyDown } from "../utils/keyboard";
import { PopoverContext, type PopoverOpenChangeReason } from "../popover/popover-context";
import { EmojiContext, SharedProvider, useEmojiContext } from "../provider/provider";
import { ReactionsContext, type ReactionsState } from "../reactions/reactions-context";
import { flag, renderElement, resolve, type Orientation, type PartElementProps, type PartProps } from "../utils/render";
import { useClippedScrollGuard } from "../utils/scroll-guard";
import { shallowEqual, useStore } from "../utils/store";
import { SLOTS, VISUALLY_HIDDEN } from "../utils/slots";

export type CategoryOption = CoreCategoryOption<React.ReactNode>;

export type RootState = { searching: boolean; reactionsOpen: boolean };

export type RootProps = PickerHandlers<Omit<React.HTMLAttributes<HTMLElement>, "onSelect" | "children" | "role" | "className" | "style" | "defaultValue">> &
  PartProps<RootState> & {
    onSelect?: (selection: EmojiSelection, details: RootSelectDetails) => void;
    actionsRef?: React.Ref<EmojiPickerActions>;
    keyboardTarget?: HTMLElement | React.RefObject<HTMLElement | null> | null;
    columns?: "fit" | number;
    categories?: readonly CategoryOption[];
    frequent?: number | false;
    collapsedCategories?: readonly string[];
    defaultCollapsedCategories?: readonly string[];
    onCollapsedCategoriesChange?: (ids: readonly string[], details: CoreCollapsedCategoriesChangeDetails) => void;
    suggested?: readonly string[];
    searchResults?: SearchResultsMode;
    searchLimit?: number;
    query?: string;
    defaultQuery?: string;
    onQueryChange?: (query: string, details: CoreQueryChangeDetails) => void;
    value?: string | null;
    defaultValue?: string | null;
    onValueChange?: (unified: string | null, details: RootValueChangeDetails) => void;
    highlight?: string | null;
    defaultHighlight?: string | null;
    onHighlightChange?: (unified: string | null, details: CoreHighlightChangeDetails) => void;
    reactions?: readonly string[] | number;
    reactionsOpen?: boolean;
    defaultReactionsOpen?: boolean;
    onReactionsOpenChange?: (open: boolean, details: RootReactionsOpenChangeDetails) => void;
    emojiVersion?: number;
    disableVariations?: boolean;
    children: React.ReactNode;
  };

const IMPERATIVE = { reason: "imperative-action" } as const;

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
    highlight: _highlight,
    defaultHighlight: _defaultHighlight,
    onHighlightChange: _onHighlightChange,
    disableVariations: _disableVariations,
    reactions,
    reactionsOpen: reactionsOpenProp,
    defaultReactionsOpen = true,
    onReactionsOpenChange,
    searchResults = "ranked",
    searchLimit: _searchLimit,
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
  React.useLayoutEffect(() => state.setOptions(options, { notify: true }));
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

  // Passing only onValueChange tracks the value too, as in Base UI's Select
  const tracked = defaultValue !== undefined || onValueChange !== undefined ? (defaultValue ?? null) : undefined;
  const [value, setValue] = useChangeState<string | null | undefined, SelectReason>(valueProp, tracked, onValueChange as (value: string | null | undefined, details: RootValueChangeDetails) => void);
  const [open, setReactionsOpen] = useChangeState(reactionsOpenProp, defaultReactionsOpen, onReactionsOpenChange);
  const reactionsOpen = Boolean(reactions) && open;
  const collapseToReactions = React.useCallback(() => setReactionsOpen(true, "item-press"), [setReactionsOpen]);
  const latest = React.useRef({ onSelect, popover, selects: value !== undefined });
  latest.current = { onSelect, popover, selects: value !== undefined };
  const pick = React.useCallback(
    (unified: string, event?: Event, reason: SelectReason = "item-press") => {
      const selection = state.choose(unified);
      if (!selection) return undefined;
      const { onSelect, popover, selects } = latest.current;
      const details: RootSelectDetails = Object.assign(createChangeDetails(reason, event), { collapse: reactions ? collapseToReactions : undefined });
      onSelect?.(selection, details);
      if (details.isCanceled) return selection;
      if (selects) setValue(selection.unified, reason, event);
      if (popover?.closeOnSelect) popover.close("item-press", event);
      return selection;
    },
    [state, reactions, collapseToReactions, setValue],
  );
  const [variations, setVariations] = React.useState(0);
  const registerVariations = React.useCallback(() => {
    setVariations((n) => n + 1);
    return () => setVariations((n) => n - 1);
  }, []);
  const closePopover = React.useCallback((reason: PopoverOpenChangeReason, event?: Event) => {
    const { popover } = latest.current;
    popover?.close(reason, event);
    return Boolean(popover);
  }, []);
  const skinTone = React.useRef<(() => void) | null>(null);
  const actions = React.useMemo<EmojiPickerActions>(
    () => ({
      move: (to) => Boolean(list.current?.move(to, IMPERATIVE)),
      pick: () => Boolean(list.current?.pick(undefined, "imperative-action")),
      highlight: (emoji) => (list.current ? list.current.highlight(emoji, IMPERATIVE) : state.highlight(emoji, IMPERATIVE)),
      focusSearch() {
        searchInput.current?.focus();
        return Boolean(searchInput.current);
      },
      clearSearch() {
        state.setQuery("", IMPERATIVE);
        list.current?.clear();
      },
      close: () => closePopover("imperative-action"),
      toggleSkinTone() {
        skinTone.current?.();
        return Boolean(skinTone.current);
      },
    }),
    [state, closePopover],
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
      columns,
      collapse,
      searchResults,
      value,
      pick,
      actions,
      ownsFocus: (el) => el != null && (el === searchInput.current || el === target()),
      target,
      skinTone,
      list,
      root: rootRef,
      searchInput,
      listId,
      variations: { custom: variations > 0, register: registerVariations },
    }),
    [store, state, labels, popover, columns, collapse, searchResults, value, pick, actions, target, listId, variations, registerVariations],
  );
  const panelId = React.useId();
  const reactionsState = React.useMemo<ReactionsState | null>(
    () => (reactions ? { reactions: view.reactions ?? [], open: reactionsOpen, expand: panels ? () => setReactionsOpen(false, "trigger-press") : undefined, panel, panelId, registerPanel } : null),
    [reactions, view.reactions, reactionsOpen, panels, setReactionsOpen, registerPanel, panelId],
  );

  const keys = usePickerKeyDown(onKeyDown, (e) => {
    if (e.key === "Escape") {
      // With no query, Escape leaves the highlight, then the expanded picker for its reaction row, then the popover
      if (!query) return Boolean(list.current?.clear()) || Boolean(reactions && !reactionsOpen && panels && setReactionsOpen(true, "escape-key", e.nativeEvent)) || closePopover("escape-key", e.nativeEvent);
      const details = state.setQuery("", { reason: "escape-key", event: e.nativeEvent });
      list.current?.clear();
      return !details?.isPropagationAllowed;
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
      ...mergePartProps(rest, activeWithin),
      "data-columns": columns ?? undefined,
      "data-searching": flag(searching),
      "data-reactions-open": flag(reactionsOpen),
      onKeyDown: keys,
      className,
      style: (s: RootState) => ({ ...VARIABLES, ...(columns ? { "--ep-columns": columns } : {}), ...resolve(style, s) }) as React.CSSProperties,
      render,
      children: (
        <>
          <Autocomplete inputValue={query} onInputChange={(text) => state.setQuery(text, { reason: "input-change" })}>
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

// A combobox with its popup open accepts on Tab, as the typeahead's own menus do
const accepts = (el: HTMLElement) => el.getAttribute("aria-expanded") === "true";

function useKeyboardTarget(target: () => HTMLElement | null, state: PickerState<React.ReactNode>, list: React.RefObject<ListHandle | null>) {
  React.useEffect(() => {
    const el = target();
    if (!el) return;
    const unregister = state.registerInput();
    const onKeyDown = (event: KeyboardEvent) => {
      if (isComposingKey(event) || hasModifier(event)) return;
      const to = TARGET_MOVES[event.key];
      const handled = to ? list.current?.move(to, { reason: "keyboard", event }) : !event.shiftKey && (event.key === "Enter" || (event.key === "Tab" && accepts(el))) && list.current?.pick(event);
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
  return React.useContext(EmojiContext) ? root : <SharedProvider>{root}</SharedProvider>;
});

// Declared, not imported, aliases: the .d.ts bundler restores an import's original name, which the namespace member would shadow
type QueryDetails = CoreQueryChangeDetails;
type HighlightDetails = CoreHighlightChangeDetails;
type ValueDetails = RootValueChangeDetails;
type CollapsedDetails = CoreCollapsedCategoriesChangeDetails;
type ReactionsOpenDetails = RootReactionsOpenChangeDetails;
type SelectionDetails = RootSelectDetails;

export declare namespace Root {
  type Props = RootProps;
  type State = RootState;
  type Actions = EmojiPickerActions;
  type QueryChangeDetails = QueryDetails;
  type HighlightChangeDetails = HighlightDetails;
  type ValueChangeDetails = ValueDetails;
  type CollapsedCategoriesChangeDetails = CollapsedDetails;
  type ReactionsOpenChangeDetails = ReactionsOpenDetails;
  type SelectDetails = SelectionDetails;
}

export function useActiveEmoji(): EmojiRecord | null {
  return useStore(usePicker("useActiveEmoji").state, (s) => s.active?.record ?? null);
}

export type NavCategory = { id: string; name: string; icon?: React.ReactNode };

export type CategoryNavigation = {
  categories: readonly NavCategory[];
  activeCategory: string | null;
  jumpToCategory(id: string, options?: { instant?: boolean }): void;
};

export function useCategoryNavigation(): CategoryNavigation {
  const picker = usePicker("useCategoryNavigation");
  const view = useStore(picker.state, ({ categories, categorySections, searching, activeSection }) => ({ categories, categorySections, searching, activeSection }), shallowEqual);
  const categories = React.useMemo(() => {
    const shown = new Set(view.categorySections.map((s) => s.id));
    return view.categories.filter((c) => c.nav && shown.has(c.id)).map(({ id, name, icon }) => ({ id, name, icon }));
  }, [view.categories, view.categorySections]);
  const { list, collapse } = picker;
  const jumpToCategory = React.useCallback(
    (id: string, options?: { instant?: boolean }) => {
      const collapsed = collapse.isCollapsed(id);
      if (collapsed) collapse.setCollapsed(id, false);
      list.current?.jump(id, { ...options, afterRender: collapsed });
    },
    [list, collapse],
  );
  return { categories, activeCategory: view.searching ? null : view.activeSection, jumpToCategory };
}

export type SearchStateValue = { query: string; resultCount: number | null };

export function useSearchState(): SearchStateValue {
  const { state } = usePicker("useSearchState");
  return useStore(state, ({ query, searching, pending, results }) => ({ query, resultCount: searching && !pending ? results.length : null }), shallowEqual);
}

export type ViewportState = { searching: boolean; orientation: Orientation };

export type ViewportProps = PartElementProps<ViewportState, HTMLDivElement>;

const SCROLL: Record<Orientation, React.CSSProperties> = {
  vertical: { overflowX: "hidden", overflowY: "scroll", overscrollBehavior: "contain" },
  horizontal: { overflowX: "auto", overflowY: "hidden", overscrollBehavior: "contain" },
};
const FIXED_GUTTER: React.CSSProperties = { scrollbarGutter: "stable" };

export const Viewport = React.forwardRef<HTMLDivElement, ViewportProps>(function Viewport({ onKeyDown, style, ...props }, ref) {
  const { state, columns } = usePicker("EmojiPicker.Viewport");
  const searching = useStore(state, (s) => s.searching);
  const [orientation, setOrientation] = React.useState<Orientation>("vertical");
  const keys = usePickerKeyDown(onKeyDown, () => false);
  return (
    <ViewportContext.Provider value={setOrientation}>
      {renderElement(
        "div",
        {
          "data-slot": SLOTS.viewport,
          "data-orientation": orientation,
          "data-searching": flag(searching),
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

export declare namespace Viewport {
  type Props = ViewportProps;
  type State = ViewportState;
}

export type PreviewState = { emoji: EmojiRecord | null };

export type PreviewProps = PartElementProps<PreviewState>;

export const Preview = React.forwardRef<HTMLDivElement, PreviewProps>(function Preview({ children, ...props }, ref) {
  const { labels } = usePicker("EmojiPicker.Preview");
  const active = useActiveEmoji();
  const caption = active ? `${active.imageUrl ? "" : active.emoji} ${active.name}`.trim() : labels.previewCaption;
  return renderElement("div", { "data-slot": SLOTS.preview, ...props, ref, children: children ?? caption }, { emoji: active });
});

export declare namespace Preview {
  type Props = PreviewProps;
  type State = PreviewState;
}
