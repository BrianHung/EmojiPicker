"use client";

import * as React from "react";
import { useFocusWithin } from "react-aria/useFocusWithin";
import { useObjectRef } from "react-aria/useObjectRef";
import { VisuallyHidden } from "react-aria/VisuallyHidden";
import { Autocomplete } from "react-aria-components/Autocomplete";
import type { CategoryOption as CoreCategoryOption, CollapsedCategoriesChangeDetails, EmojiSelection, HighlightChangeDetails, QueryChangeDetails } from "@emoji-components/core";
import { useDrawable } from "../../emoji/utils/useDrawable";
import {
  EmojiPickerRootContext,
  type EmojiPickerRootActions,
  type EmojiPickerRootChangeEventDetails,
  type EmojiPickerRootChangeEventReason,
  type EmojiPickerRootReactionsOpenChangeEventDetails,
  type EmojiPickerRootReactionsOpenChangeEventReason,
  type ListHandle,
  type SearchResultsMode,
  ReactionsContext,
  type ReactionsContextValue,
} from "./EmojiPickerRootContext";
import * as EmojiPickerRootCssVars from "./EmojiPickerRootCssVars";
import * as EmojiPickerRootDataAttributes from "./EmojiPickerRootDataAttributes";
import * as EmojiPickerListCssVars from "../list/EmojiPickerListCssVars";
import { useKeyboardTarget } from "./utils/useKeyboardTarget";
import { useResultCount } from "./utils/useEmojiPickerSearch";
import { usePickerEngine } from "./utils/usePickerEngine";
import { EmojiProviderContext, useEmojiContext } from "../../provider/EmojiProviderContext";
import { SharedProvider } from "../../provider/EmojiProvider";
import { mergePartProps } from "../../internals/mergePartProps";
import type { EmojiComponentsHandlers, EmojiComponentsPartProps } from "../../internals/types";
import { useActiveWithin } from "../../utils/useActiveWithin";
import { hasModifier, usePickerKeyDown } from "../../internals/usePickerKeyDown";
import { renderElement, resolve } from "../../internals/renderElement";
import { useClippedScrollGuard } from "../../utils/useClippedScrollGuard";
import { SLOTS } from "../../internals/slots";
import { shallowEqual, useStore } from "../../utils/useStore";
import { elementOf } from "../../utils/dom";
import { useLayoutEffect } from "../../utils/useLayoutEffect";

export type CategoryOption = CoreCategoryOption<React.ReactNode>;

export type EmojiPickerRootState = { searching: boolean; reactionsOpen: boolean };

export type EmojiPickerRootProps = EmojiComponentsHandlers<Omit<React.HTMLAttributes<HTMLElement>, "onSelect" | "children" | "role" | "className" | "style" | "defaultValue">> &
  EmojiComponentsPartProps<EmojiPickerRootState> & {
    onSelect?: (selection: EmojiSelection, details: EmojiPickerRootChangeEventDetails) => void;
    actionsRef?: React.Ref<EmojiPickerRootActions>;
    keyboardTarget?: HTMLElement | React.RefObject<HTMLElement | null> | null;
    columns?: "fit" | number;
    categories?: readonly CategoryOption[];
    frequent?: number | false | readonly string[];
    collapsedCategories?: readonly string[];
    defaultCollapsedCategories?: readonly string[];
    onCollapsedCategoriesChange?: (ids: readonly string[], details: CollapsedCategoriesChangeDetails) => void;
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
    emojiVersion: emojiVersionProp,
    categories,
    collapsedCategories,
    defaultCollapsedCategories,
    onCollapsedCategoriesChange,
    query: queryProp,
    defaultQuery,
    onQueryChange,
    value,
    defaultValue,
    onValueChange,
    highlight,
    defaultHighlight,
    onHighlightChange,
    disableVariations,
    reactions,
    reactionsOpen,
    defaultReactionsOpen,
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
  const emojiVersion = maxVersion == null ? emojiVersionProp : Math.min(emojiVersionProp ?? Infinity, maxVersion);
  const rootRef = useObjectRef(ref);
  const native = useDrawable(rootRef);
  const state = usePickerEngine(store, {
    labels,
    categories,
    frequent,
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
    value,
    defaultValue,
    onValueChange,
    onSelect,
    disableVariations,
    reactions,
    reactionsOpen,
    defaultReactionsOpen,
    onReactionsOpenChange,
  });
  const view = useStore(state, ({ query, searching, reactions, reactionsOpen }) => ({ query, searching, reactions, reactionsOpen }), shallowEqual);
  React.useEffect(() => state.mount(), [state]);
  const activeWithin = useActiveWithin(state.hold);
  useClippedScrollGuard(rootRef);

  const { searching } = view;
  // A controlled query shows in the field this render; the engine takes it in the layout effect
  const query = queryProp ?? view.query;
  const list = React.useRef<ListHandle | null>(null);
  const searchInput = React.useRef<HTMLInputElement | null>(null);
  const panel = React.useRef<HTMLDivElement | null>(null);
  const [items] = React.useState(() => new Map<string, HTMLElement>());
  const [panels, registerPanel] = useMounted();
  const listId = React.useId();

  // Focus follows the part that hides: from the Panel to the reaction row, and from the row into the Panel
  const shown = React.useRef(view.reactionsOpen);
  useLayoutEffect(() => {
    if (shown.current === view.reactionsOpen) return;
    shown.current = view.reactionsOpen;
    const active = document.activeElement;
    const lost = !active || active === document.body || !active.isConnected;
    if (view.reactionsOpen) {
      const first = [...items.values()].reduce<HTMLElement | null>((a, b) => (a && !(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING) ? a : b), null);
      if (lost || panel.current?.contains(active)) first?.focus({ preventScroll: true });
    } else if (lost) {
      if (searchInput.current) searchInput.current.focus({ preventScroll: true });
      else list.current?.focus();
    }
  }, [view.reactionsOpen, items]);
  const [variations, registerVariations] = useMounted();
  const [statuses, registerStatus] = useMounted();
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
      toggleSkinTone() {
        skinTone.current?.();
        return Boolean(skinTone.current);
      },
    }),
    [state],
  );
  React.useImperativeHandle(actionsRef, () => actions, [actions]);
  const target = React.useCallback(() => elementOf(keyboardTarget), [keyboardTarget]);
  const ownsFocus = React.useCallback((el: Element | null) => el != null && (el === searchInput.current || el === target()), [target]);
  // The search field's highlight ends when focus leaves the picker, as the grid's does
  const { focusWithinProps } = useFocusWithin({ onBlurWithin: (e) => !ownsFocus(e.relatedTarget as Element | null) && state.highlight(null) });
  useKeyboardTarget(target, state, list);

  const context = React.useMemo<EmojiPickerRootContext>(
    () => ({
      store,
      state,
      labels,
      columns,
      searchResults,
      actions,
      ownsFocus,
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
    [store, state, labels, columns, searchResults, actions, ownsFocus, target, rootRef, listId, variations, registerVariations, registerStatus, native],
  );
  const panelId = React.useId();
  const reactionsContext = React.useMemo<ReactionsContextValue | null>(
    () => (reactions ? { reactions: view.reactions ?? [], open: view.reactionsOpen, expandable: panels > 0, items, panel, panelId, registerPanel } : null),
    [reactions, view.reactions, view.reactionsOpen, panels, items, registerPanel, panelId],
  );

  const keys = usePickerKeyDown(onKeyDown, (e) => {
    if (e.key === "Escape") {
      // With no query, Escape leaves the highlight, then the expanded picker for its reaction row, then goes on to an enclosing popover
      if (!query) return Boolean(list.current?.clear()) || Boolean(reactions && !view.reactionsOpen && panels && state.setReactionsOpen(true, { reason: "escape-key", event: e.nativeEvent }));
      const details = state.setQuery("", { reason: "escape-key", event: e.nativeEvent });
      list.current?.clear();
      return !details?.isPropagationAllowed;
    }
    return e.key === "/" && !hasModifier(e) && !isTextField(e.target) && actions.focusSearch();
  });
  const resultCount = useResultCount(state);
  const count = resultCount === null ? "" : labels.resultCount(resultCount);
  const rootState: EmojiPickerRootState = { searching, reactionsOpen: view.reactionsOpen };

  return renderElement(
    "div",
    {
      ref: rootRef,
      role: "group",
      "aria-label": rest["aria-labelledby"] ? undefined : labels.picker,
      ...mergePartProps(rest, activeWithin, focusWithinProps),
      "data-slot": SLOTS.root,
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
  type QueryChangeEventReason = QueryChangeDetails["reason"];
  type QueryChangeEventDetails = QueryChangeDetails;
  type HighlightChangeEventReason = HighlightChangeDetails["reason"];
  type HighlightChangeEventDetails = HighlightChangeDetails;
  type CollapsedCategoriesChangeEventReason = CollapsedCategoriesChangeDetails["reason"];
  type CollapsedCategoriesChangeEventDetails = CollapsedCategoriesChangeDetails;
  type ReactionsOpenChangeEventReason = EmojiPickerRootReactionsOpenChangeEventReason;
  type ReactionsOpenChangeEventDetails = EmojiPickerRootReactionsOpenChangeEventDetails;
}
