"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { useObjectRef } from "react-aria/useObjectRef";
import { VisuallyHidden } from "react-aria/VisuallyHidden";
import { Autocomplete } from "react-aria-components/Autocomplete";
import type { CategoryOption as CoreCategoryOption, CollapsedCategoriesChangeDetails, EmojiSelection, HighlightChangeDetails, QueryChangeDetails } from "@emoji-components/core";
import { createChangeDetails } from "@emoji-components/core/internal";
import { useCollapse } from "./utils/useCollapse";
import { useDrawable } from "../../emoji/utils/useDrawable";
import {
  EmojiPickerRootContext,
  type EmojiPickerRootActions,
  type EmojiPickerRootChangeEventDetails,
  type EmojiPickerRootChangeEventReason,
  type EmojiPickerRootReactionsOpenChangeEventDetails,
  type EmojiPickerRootReactionsOpenChangeEventReason,
  type EmojiPickerRootSelectEventDetails,
  type ListHandle,
  type SearchResultsMode,
  ReactionsContext,
  type ReactionsContextValue,
} from "./EmojiPickerRootContext";
import * as EmojiPickerRootCssVars from "./EmojiPickerRootCssVars";
import * as EmojiPickerRootDataAttributes from "./EmojiPickerRootDataAttributes";
import * as EmojiPickerListCssVars from "../list/EmojiPickerListCssVars";
import { useKeyboardTarget } from "./utils/useKeyboardTarget";
import { usePickerEngine } from "./utils/usePickerEngine";
import { PopoverContext } from "../../popover/root/EmojiPopoverRootContext";
import type { EmojiPopoverRootChangeEventReason } from "../../popover/utils/types";
import { EmojiProviderContext, useEmojiContext } from "../../provider/EmojiProviderContext";
import { SharedProvider } from "../../provider/EmojiProvider";
import { BUTTONS } from "../reactions/ReactionBar";
import { mergePartProps } from "../../internals/mergePartProps";
import type { EmojiComponentsHandlers, EmojiComponentsPartProps } from "../../internals/types";
import { useActiveWithin } from "../../utils/useActiveWithin";
import { hasModifier, usePickerKeyDown } from "../../internals/usePickerKeyDown";
import { useLatest } from "../../utils/useLatest";
import { renderElement, resolve } from "../../internals/renderElement";
import { useClippedScrollGuard } from "../../utils/useClippedScrollGuard";
import { SLOTS } from "../../internals/slots";
import { useChangeState } from "../../utils/useChangeState";
import { shallowEqual, useStore } from "../../utils/useStore";
import { elementOf } from "../../utils/dom";

export type CategoryOption = CoreCategoryOption<React.ReactNode>;

export type EmojiPickerRootState = { searching: boolean; reactionsOpen: boolean };

export type EmojiPickerRootProps = EmojiComponentsHandlers<Omit<React.HTMLAttributes<HTMLElement>, "onSelect" | "children" | "role" | "className" | "style" | "defaultValue">> &
  EmojiComponentsPartProps<EmojiPickerRootState> & {
    onSelect?: (selection: EmojiSelection, details: EmojiPickerRootSelectEventDetails) => void;
    actionsRef?: React.Ref<EmojiPickerRootActions>;
    keyboardTarget?: HTMLElement | React.RefObject<HTMLElement | null> | null;
    columns?: "fit" | number;
    categories?: readonly CategoryOption[];
    frequent?: number | false;
    collapsedCategories?: readonly string[];
    defaultCollapsedCategories?: readonly string[];
    onCollapsedCategoriesChange?: (ids: readonly string[], details: CollapsedCategoriesChangeDetails) => void;
    suggested?: readonly string[];
    searchResults?: SearchResultsMode;
    searchLimit?: number;
    query?: string;
    defaultQuery?: string;
    onQueryChange?: (query: string, details: QueryChangeDetails) => void;
    value?: string | null;
    defaultValue?: string | null;
    onValueChange?: (unified: string | null, details: EmojiPickerRootChangeEventDetails) => void;
    highlight?: string | null;
    defaultHighlight?: string | null;
    onHighlightChange?: (unified: string | null, details: HighlightChangeDetails) => void;
    reactions?: readonly string[] | number;
    reactionsOpen?: boolean;
    defaultReactionsOpen?: boolean;
    onReactionsOpenChange?: (open: boolean, details: EmojiPickerRootReactionsOpenChangeEventDetails) => void;
    emojiVersion?: number;
    disableVariations?: boolean;
    children: React.ReactNode;
  };

const IMPERATIVE = { reason: "imperative-action" } as const;

const VARIABLES = {
  "--ep-size": `var(${EmojiPickerRootCssVars.emojiSize}, 30px)`,
  "--ep-cell": `var(${EmojiPickerRootCssVars.emojiCellSize}, calc(var(--ep-size) + 10px))`,
  "--ep-pad": `var(${EmojiPickerListCssVars.listPadding}, 10px)`,
  "--ep-header": `var(${EmojiPickerListCssVars.headerHeight}, 40px)`,
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

const PickerRoot = React.forwardRef<HTMLElement, EmojiPickerRootProps>(function PickerRoot(props, ref) {
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
  const rootRef = useObjectRef(ref);
  const native = useDrawable(rootRef);
  const state = usePickerEngine(store, {
    labels,
    categories,
    frequent,
    suggested,
    emojiVersion,
    drawable: native.drawable,
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
    (reason: EmojiPickerRootReactionsOpenChangeEventReason, event?: Event) => {
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
    (unified: string, event?: Event, reason: EmojiPickerRootChangeEventReason = "item-press") => {
      const selection = state.choose(unified);
      if (!selection) return undefined;
      const { onSelect, popover, selects } = latest.current;
      const details: EmojiPickerRootSelectEventDetails = Object.assign(createChangeDetails(reason, event), { collapse: reactions ? collapseToReactions : undefined });
      onSelect?.(selection, details);
      if (details.isCanceled) return selection;
      if (selects) setValue(selection.unified, createChangeDetails(reason, event));
      popover?.close("item-press", event);
      return selection;
    },
    [state, latest, reactions, collapseToReactions, setValue],
  );
  const [variations, registerVariations] = useMounted();
  const [statuses, registerStatus] = useMounted();
  const closePopover = React.useCallback(
    (reason: EmojiPopoverRootChangeEventReason, event?: Event) => {
      const { popover } = latest.current;
      popover?.close(reason, event);
      return Boolean(popover);
    },
    [latest],
  );
  const skinTone = React.useRef<(() => void) | null>(null);
  const actions = React.useMemo<EmojiPickerRootActions>(
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

  const context = React.useMemo<EmojiPickerRootContext>(
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
      registerStatus,
      native,
    }),
    [store, state, labels, popover, columns, collapse, searchResults, selects, value, pick, actions, target, rootRef, listId, variations, registerVariations, registerStatus, native],
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
  const rootState: EmojiPickerRootState = { searching, reactionsOpen };

  return renderElement(
    "div",
    {
      ref: rootRef,
      role: "group",
      "data-slot": SLOTS.root,
      "aria-label": rest["aria-labelledby"] ? undefined : labels.picker,
      ...mergePartProps(rest, activeWithin),
      [EmojiPickerRootDataAttributes.columns]: columns ?? undefined,
      onKeyDown: keys,
      className,
      style: (s: EmojiPickerRootState) => ({ ...VARIABLES, ...(columns ? { "--ep-columns": columns } : {}), ...resolve(style, s) }) as React.CSSProperties,
      render,
      children: (
        <>
          <Autocomplete inputValue={query} onInputChange={(text) => state.setQuery(text, { reason: "input-change" })}>
            <EmojiPickerRootContext.Provider value={context}>
              <ReactionsContext.Provider value={reactionsContext}>{children}</ReactionsContext.Provider>
            </EmojiPickerRootContext.Provider>
          </Autocomplete>
          {statuses ? null : (
            <VisuallyHidden elementType="span" role="status" aria-live="polite" aria-atomic="true" data-slot={SLOTS.searchStatus}>
              {count}
            </VisuallyHidden>
          )}
        </>
      ),
    },
    rootState,
    ["searching", "reactionsOpen"],
  );
});

export const EmojiPickerRoot = React.forwardRef<HTMLElement, EmojiPickerRootProps>(function EmojiPickerRoot(props, ref) {
  const root = <PickerRoot {...props} ref={ref} />;
  return React.useContext(EmojiProviderContext) ? root : <SharedProvider>{root}</SharedProvider>;
});

export declare namespace EmojiPickerRoot {
  type Props = EmojiPickerRootProps;
  type State = EmojiPickerRootState;
  type Actions = EmojiPickerRootActions;
  type ChangeEventReason = EmojiPickerRootChangeEventReason;
  type ChangeEventDetails = EmojiPickerRootChangeEventDetails;
  type SelectEventDetails = EmojiPickerRootSelectEventDetails;
  type QueryChangeEventReason = QueryChangeDetails["reason"];
  type QueryChangeEventDetails = QueryChangeDetails;
  type HighlightChangeEventReason = HighlightChangeDetails["reason"];
  type HighlightChangeEventDetails = HighlightChangeDetails;
  type CollapsedCategoriesChangeEventReason = CollapsedCategoriesChangeDetails["reason"];
  type CollapsedCategoriesChangeEventDetails = CollapsedCategoriesChangeDetails;
  type ReactionsOpenChangeEventReason = EmojiPickerRootReactionsOpenChangeEventReason;
  type ReactionsOpenChangeEventDetails = EmojiPickerRootReactionsOpenChangeEventDetails;
}
