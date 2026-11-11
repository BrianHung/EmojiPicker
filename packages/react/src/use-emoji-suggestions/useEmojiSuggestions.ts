"use client";

import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { createEmojiSuggestions, type EmojiSelection, type EmojiSuggestionsStore, type EmojiSuggestionsOptions, type EmojiTrigger, type KeyLike, type ShortcodeCompletion } from "@emoji-components/core";
import { useEmojiStatus } from "../provider/utils/useEmojiStatus";
import { useEmojiContext } from "../provider/EmojiProviderContext";
import { useLatest, useStableCallback } from "../utils/useLatest";
import { useStore } from "../utils/useStore";
import { elementOf } from "../utils/dom";
import { useLayoutEffect } from "../utils/useLayoutEffect";

type SuggestionsElement = HTMLElement | React.RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined) | null;

export type UseEmojiSuggestionsOptions = Pick<EmojiSuggestionsOptions, "limit" | "matchBy" | "order" | "columns" | "onSelect"> & {
  // The `:query` at the caret; null while there is none
  trigger?: EmojiTrigger | null;
  // An editor element the app doesn't render; a field that spreads getInputProps() needs none
  element?: SuggestionsElement;
  insertAs?: "emoji" | "shortcode";
};

// Around core's createEmojiSuggestions, for an editor plugin that finds the query itself, such as the ProseMirror item
export type UseEmojiSuggestionsStoreOptions = {
  store: EmojiSuggestionsStore;
  anchor: () => DOMRect | null;
  element?: SuggestionsElement;
};

// The query's box, as a Floating UI virtual element: refs.setPositionReference(anchor)
export type EmojiSuggestionsAnchor = {
  getBoundingClientRect(): DOMRect;
  readonly contextElement: Element | undefined;
};

type Snapshot = ReturnType<EmojiSuggestionsStore["getSnapshot"]>;
type InputProps = ReturnType<EmojiSuggestionsStore["getInputProps"]> & { ref: React.RefCallback<HTMLElement>; onKeyDown?: (event: React.KeyboardEvent) => void };
type ListProps = ReturnType<EmojiSuggestionsStore["getListProps"]> & { onMouseDown: (event: React.MouseEvent) => void };
type OptionProps = ReturnType<EmojiSuggestionsStore["getOptionProps"]> & { onMouseDown: (event: React.MouseEvent) => void; onPointerMove: (event: React.PointerEvent) => void };

export type UseEmojiSuggestionsReturnValue = Pick<Snapshot, "open" | "query" | "suggestions" | "highlightedIndex"> & {
  anchor: EmojiSuggestionsAnchor;
  highlight(index: number): void;
  pick(index?: number): void;
  // A selection another UI made and already recorded, such as a picker in the menu
  insert(selection: EmojiSelection): void;
  dismiss(): void;
  // For an editor that routes keys through its own commands; true when the menu handled the key
  onKeyDown(event: KeyLike): boolean;
  // The combobox ARIA, the field's ref, and its keys
  getInputProps<P extends object = object>(props?: P): P & InputProps;
  getListProps<P extends object = object>(props?: P): P & ListProps;
  getOptionProps<P extends object = object>(index: number, props?: P): P & OptionProps;
};

type Options = UseEmojiSuggestionsOptions | UseEmojiSuggestionsStoreOptions;

const closed = () => null;
const targetOf = (element: SuggestionsElement | undefined): HTMLElement | null => (typeof element === "function" ? (element() ?? null) : elementOf(element));
// mousedown, not click: keeps focus and the caret in the field
const keepFocus = (event: React.MouseEvent) => event.preventDefault();

// One store for the component's life; values sync in a layout effect keyed on them, and callbacks are read at call time
function useSuggestionsStore({ trigger, limit, matchBy, order, columns, onSelect, insertAs = "emoji" }: UseEmojiSuggestionsOptions): EmojiSuggestionsStore {
  const { store: emojiStore } = useEmojiContext();
  const id = React.useId();
  const query = trigger?.query ?? "";
  const replace = useLatest(trigger?.replace);
  const choose = useStableCallback((s: ShortcodeCompletion): void => replace.current?.(store.textFor(s, insertAs), s));
  const select = useStableCallback((selection: EmojiSelection) => onSelect?.(selection));
  const [store] = React.useState<EmojiSuggestionsStore>(() => createEmojiSuggestions(emojiStore, { query, limit, matchBy, order, columns, id, onChoose: choose, onSelect: select }));
  useLayoutEffect(() => store.setOptions({ query, limit, matchBy, order, columns, id, onChoose: choose, onSelect: select }), [store, query, limit, matchBy, order, columns, id, choose, select]);
  return store;
}

export function useSuggestions(options: Options, field: React.MutableRefObject<HTMLElement | null>, keys: boolean): UseEmojiSuggestionsReturnValue {
  const external = "store" in options;
  const own = useSuggestionsStore(external ? {} : options);
  const store = external ? options.store : own;
  const { labels } = useEmojiContext();
  useEmojiStatus();
  const { open, query, suggestions, highlightedIndex } = useStore(store);
  const target = useLatest(() => targetOf(options.element) ?? field.current);
  const rect = useLatest(external ? options.anchor : (options.trigger?.anchor ?? closed));
  // Keeps the last box once the query is gone, for an exit animation
  const [anchor] = React.useState<EmojiSuggestionsAnchor>(() => {
    let last: DOMRect | null = null;
    return {
      getBoundingClientRect: () => (last = rect.current() ?? last ?? new DOMRect()),
      get contextElement() {
        return target.current() ?? undefined;
      },
    };
  });
  // A store from elsewhere, such as the ProseMirror plugin, syncs its own field
  React.useEffect(() => {
    const el = open && !external ? target.current() : null;
    if (!el) return;
    el.addEventListener("blur", store.dismiss);
    const unsync = store.syncCombobox(el);
    return () => {
      el.removeEventListener("blur", store.dismiss);
      unsync();
    };
  }, [open, external, store, target]);
  const setField = React.useCallback((el: HTMLElement | null) => void (field.current = el), [field]);
  const onKeyDown = (event: React.KeyboardEvent) => store.keydown(event.nativeEvent) && event.stopPropagation();
  return {
    open,
    query,
    suggestions,
    highlightedIndex,
    anchor,
    highlight: store.highlight,
    pick: store.choose,
    insert: store.insert,
    dismiss: store.dismiss,
    onKeyDown: store.keydown,
    getInputProps: <P extends object = object>(props?: P) => mergeProps(props, store.getInputProps(), { ref: setField }, keys ? { onKeyDown } : null) as P & InputProps,
    getListProps: <P extends object = object>(props?: P) => mergeProps({ "aria-label": labels.suggestions }, props, store.getListProps(), { onMouseDown: keepFocus }) as P & ListProps,
    getOptionProps: <P extends object = object>(index: number, props?: P) =>
      mergeProps(props, store.getOptionProps(index), {
        onMouseDown: (event: React.MouseEvent) => {
          event.preventDefault();
          store.choose(index);
        },
        onPointerMove: () => store.highlight(index),
      }) as P & OptionProps,
  };
}

export function useEmojiSuggestions(options: Options): UseEmojiSuggestionsReturnValue {
  return useSuggestions(options, React.useRef<HTMLElement | null>(null), true);
}
