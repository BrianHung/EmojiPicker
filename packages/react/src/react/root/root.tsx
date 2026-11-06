import * as React from "react";
import { flushSync } from "react-dom";
import { mergeRefs } from "react-aria/mergeRefs";
import { Autocomplete } from "react-aria-components/Autocomplete";
import type { CategoryOption as CoreCategoryOption, EmojiSelection } from "@brianhung/emoji-picker-core";
import { type CollapsedCategoriesChangeDetails as CoreCollapsedCategoriesChangeDetails, createChangeDetails, type QueryChangeDetails as CoreQueryChangeDetails } from "@brianhung/emoji-picker-core/internal";
import { useCollapse } from "./collapse";
import {
  PickerContext,
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
import { useKeyboardTarget } from "./use-keyboard-target";
import { usePickerEngine } from "./use-picker-engine";
import { PopoverContext, type PopoverOpenChangeReason } from "../popover/popover-context";
import { EmojiContext, SharedProvider, useEmojiContext } from "../provider/provider";
import { BUTTONS } from "../reactions/reaction-bar";
import { ReactionsContext, type ReactionsContextValue } from "../reactions/reactions-context";
import { mergePartProps, type PickerHandlers } from "../utils/events";
import { useActiveWithin } from "../utils/hold";
import { hasModifier, usePickerKeyDown } from "../utils/keyboard";
import { useLatest } from "../utils/latest";
import { renderElement, resolve, type PartProps } from "../utils/render";
import { useClippedScrollGuard } from "../utils/scroll-guard";
import { SLOTS, VISUALLY_HIDDEN } from "../utils/slots";
import { useChangeState } from "../utils/state";
import { shallowEqual, useStore } from "../utils/store";
import { elementOf } from "../utils/utils";

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

// How many of an optional part are mounted, for a default that steps aside
function useMounted() {
  const [count, setCount] = React.useState(0);
  const register = React.useCallback(() => {
    setCount((n) => n + 1);
    return () => setCount((n) => n - 1);
  }, []);
  return [count, register] as const;
}

const isTextField = (el: EventTarget | null) =>
  el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !["button", "checkbox", "radio", "submit", "reset"].includes(el.type)) || (el instanceof HTMLElement && el.isContentEditable);

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
    query: queryProp,
    defaultQuery,
    onQueryChange,
    value: valueProp,
    defaultValue,
    onValueChange,
    highlight,
    defaultHighlight,
    onHighlightChange,
    disableVariations,
    reactions,
    reactionsOpen: reactionsOpenProp,
    defaultReactionsOpen = true,
    onReactionsOpenChange,
    searchResults = "ranked",
    searchLimit,
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
  const state = usePickerEngine(store, {
    labels,
    categories,
    frequent,
    suggested,
    emojiVersion,
    searchResults,
    searchLimit,
    query: queryProp,
    defaultQuery,
    onQueryChange,
    collapsedCategories,
    defaultCollapsedCategories,
    onCollapsedCategoriesChange,
    highlight,
    defaultHighlight,
    onHighlightChange,
    disableVariations,
    reactions,
  });
  const view = useStore(state, ({ query, searching, results, pending, collapsed, reactions }) => ({ query, searching, results, pending, collapsed, reactions }), shallowEqual);
  React.useEffect(() => state.mount(), [state]);
  const activeWithin = useActiveWithin(state.hold);
  useClippedScrollGuard(rootRef);

  const collapse = useCollapse(state, view.collapsed);
  const { searching, results, pending } = view;
  // A controlled query shows in the field this render; the engine takes it in the layout effect
  const query = queryProp ?? view.query;
  const list = React.useRef<ListHandle | null>(null);
  const searchInput = React.useRef<HTMLInputElement | null>(null);
  const panel = React.useRef<HTMLDivElement | null>(null);
  const row = React.useRef<HTMLDivElement | null>(null);
  const [panels, registerPanel] = useMounted();
  const listId = React.useId();

  // Passing only onValueChange tracks the value too, as in Base UI's Select
  const selects = valueProp !== undefined || defaultValue !== undefined || onValueChange !== undefined;
  const [value, setValue] = useChangeState(valueProp, defaultValue ?? null, onValueChange);
  const [open, setOpen] = useChangeState(reactionsOpenProp, defaultReactionsOpen, onReactionsOpenChange);
  const reactionsOpen = Boolean(reactions) && open;
  // Back to the reaction row; focus follows when it was in the panel, which hides
  const showReactions = React.useCallback(
    (reason: RootReactionsOpenChangeDetails["reason"], event?: Event) => {
      const details = flushSync(() => setOpen(true, createChangeDetails(reason, event)));
      const active = document.activeElement;
      if (details && !details.isCanceled && (!active || active === document.body || panel.current?.contains(active))) row.current?.querySelector<HTMLElement>(BUTTONS)?.focus({ preventScroll: true });
      return details;
    },
    [setOpen],
  );
  const expand = React.useCallback(
    (event?: Event) => {
      const details = flushSync(() => setOpen(false, createChangeDetails("trigger-press", event)));
      if (!details || details.isCanceled) return;
      if (searchInput.current) searchInput.current.focus({ preventScroll: true });
      else list.current?.focus();
    },
    [setOpen],
  );
  const collapseToReactions = React.useCallback(() => void showReactions("item-press"), [showReactions]);
  const latest = useLatest({ onSelect, popover, selects });
  const pick = React.useCallback(
    (unified: string, event?: Event, reason: SelectReason = "item-press") => {
      const selection = state.choose(unified);
      if (!selection) return undefined;
      const { onSelect, popover, selects } = latest.current;
      const details: RootSelectDetails = Object.assign(createChangeDetails(reason, event), { collapse: reactions ? collapseToReactions : undefined });
      onSelect?.(selection, details);
      if (details.isCanceled) return selection;
      if (selects) setValue(selection.unified, createChangeDetails(reason, event));
      if (popover?.closeOnSelect) popover.close("item-press", event);
      return selection;
    },
    [state, latest, reactions, collapseToReactions, setValue],
  );
  const [variations, registerVariations] = useMounted();
  const closePopover = React.useCallback(
    (reason: PopoverOpenChangeReason, event?: Event) => {
      const { popover } = latest.current;
      popover?.close(reason, event);
      return Boolean(popover);
    },
    [latest],
  );
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
  const target = React.useCallback(() => elementOf(keyboardTarget), [keyboardTarget]);
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
      value: selects ? value : undefined,
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
    [store, state, labels, popover, columns, collapse, searchResults, selects, value, pick, actions, target, listId, variations, registerVariations],
  );
  const panelId = React.useId();
  const reactionsContext = React.useMemo<ReactionsContextValue | null>(
    () => (reactions ? { reactions: view.reactions ?? [], open: reactionsOpen, expand: panels ? expand : undefined, row, panel, panelId, registerPanel } : null),
    [reactions, view.reactions, reactionsOpen, panels, expand, registerPanel, panelId],
  );

  const keys = usePickerKeyDown(onKeyDown, (e) => {
    if (e.key === "Escape") {
      // With no query, Escape leaves the highlight, then the expanded picker for its reaction row, then the popover
      if (!query) return Boolean(list.current?.clear()) || Boolean(reactions && !reactionsOpen && panels && showReactions("escape-key", e.nativeEvent)) || closePopover("escape-key", e.nativeEvent);
      const details = state.setQuery("", { reason: "escape-key", event: e.nativeEvent });
      list.current?.clear();
      return !details?.isPropagationAllowed;
    }
    return e.key === "/" && !hasModifier(e) && !isTextField(e.target) && actions.focusSearch();
  });
  const count = !searching || pending ? "" : labels.resultCount(results.length);
  const rootState: RootState = { searching, reactionsOpen };

  return renderElement(
    "aside",
    {
      ref: mergeRefs(ref, rootRef),
      "data-slot": SLOTS.root,
      "aria-label": rest["aria-labelledby"] ? undefined : labels.picker,
      ...mergePartProps(rest, activeWithin),
      "data-columns": columns ?? undefined,
      onKeyDown: keys,
      className,
      style: (s: RootState) => ({ ...VARIABLES, ...(columns ? { "--ep-columns": columns } : {}), ...resolve(style, s) }) as React.CSSProperties,
      render,
      children: (
        <>
          <Autocomplete inputValue={query} onInputChange={(text) => state.setQuery(text, { reason: "input-change" })}>
            <PickerContext.Provider value={context}>
              <ReactionsContext.Provider value={reactionsContext}>{children}</ReactionsContext.Provider>
            </PickerContext.Provider>
          </Autocomplete>
          <span role="status" aria-live="polite" aria-atomic="true" data-slot={SLOTS.searchStatus} style={VISUALLY_HIDDEN}>
            {count}
          </span>
        </>
      ),
    },
    rootState,
    ["searching", "reactionsOpen"],
  );
});

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
  type QueryChangeEventDetails = QueryDetails;
  type HighlightChangeEventDetails = HighlightDetails;
  type ValueChangeEventDetails = ValueDetails;
  type CollapsedCategoriesChangeEventDetails = CollapsedDetails;
  type ReactionsOpenChangeEventDetails = ReactionsOpenDetails;
  type SelectEventDetails = SelectionDetails;
}
