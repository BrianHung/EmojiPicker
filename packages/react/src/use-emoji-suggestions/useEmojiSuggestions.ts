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

export type UseEmojiSuggestionsOptions = Pick<EmojiSuggestionsOptions, "limit" | "matchBy" | "order" | "columns" | "onSelect"> & {
  insert?: "emoji" | "shortcode";
};

type OptionHandlers = {
  onMouseDown: (event: React.MouseEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
};

type Snapshot = ReturnType<EmojiSuggestionsStore["getSnapshot"]>;
type ListProps = ReturnType<EmojiSuggestionsStore["getListProps"]>;
type OptionProps = ReturnType<EmojiSuggestionsStore["getOptionProps"]>;

export type UseEmojiSuggestionsReturnValue = Snapshot & {
  anchor: () => DOMRect | null;
  setHighlightedIndex: (index: number) => void;
  choose(index?: number): void;
  insert(selection: EmojiSelection): void;
  dismiss(): void;
  textFor(suggestion: ShortcodeCompletion, insert?: "emoji" | "shortcode"): string;
  onKeyDown(event: KeyLike): boolean;
  getListProps<P extends object = object>(props?: P): P & ListProps;
  getOptionProps<P extends object = object>(index: number, props?: P): P & OptionProps & OptionHandlers;
};

type SuggestionsElement = HTMLElement | React.RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined) | null;

const closed = () => null;

const targetOf = (element: SuggestionsElement | undefined): HTMLElement | null => (typeof element === "function" ? (element() ?? null) : elementOf(element));

const isSuggestionsStore = (source: EmojiTrigger | EmojiSuggestionsStore | null): source is EmojiSuggestionsStore => typeof (source as EmojiSuggestionsStore | null)?.subscribe === "function";

// One store for the component's life; values sync in a layout effect keyed on them, and callbacks are read at call time
function useSuggestionsStore({ limit, matchBy, order, columns, onSelect }: UseEmojiSuggestionsOptions, query: string, onChoose: (suggestion: ShortcodeCompletion) => void): EmojiSuggestionsStore {
  const { store: emojiStore } = useEmojiContext();
  const id = React.useId();
  const choose = useStableCallback(onChoose);
  const select = useStableCallback((selection: EmojiSelection) => onSelect?.(selection));
  const [store] = React.useState(() => createEmojiSuggestions(emojiStore, { query, limit, matchBy, order, columns, id, onChoose: choose, onSelect: select }));
  useLayoutEffect(() => store.setOptions({ query, limit, matchBy, order, columns, id, onChoose: choose, onSelect: select }), [store, query, limit, matchBy, order, columns, id, choose, select]);
  return store;
}

export function useEmojiSuggestions(trigger: EmojiTrigger | null, options?: UseEmojiSuggestionsOptions, element?: SuggestionsElement): UseEmojiSuggestionsReturnValue;
export function useEmojiSuggestions(suggestions: EmojiSuggestionsStore, options: { anchor: () => DOMRect | null }): UseEmojiSuggestionsReturnValue;
export function useEmojiSuggestions(source: EmojiTrigger | EmojiSuggestionsStore | null, options: UseEmojiSuggestionsOptions & { anchor?: () => DOMRect | null } = {}, element?: SuggestionsElement): UseEmojiSuggestionsReturnValue {
  const trigger = isSuggestionsStore(source) ? null : source;
  const own = useSuggestionsStore(options, trigger?.query ?? "", (s) => trigger?.replace(own.textFor(s, options.insert ?? "emoji"), s));
  const store = isSuggestionsStore(source) ? source : own;
  const { labels } = useEmojiContext();
  useEmojiStatus();
  const snapshot = useStore(store);
  const { open } = snapshot;
  const target = useLatest(element);
  React.useEffect(() => {
    const el = open ? targetOf(target.current) : null;
    if (!el) return;
    el.addEventListener("blur", store.dismiss);
    const unsync = store.syncCombobox(el);
    return () => {
      el.removeEventListener("blur", store.dismiss);
      unsync();
    };
  }, [open, store, target]);
  return {
    ...snapshot,
    anchor: options.anchor ?? trigger?.anchor ?? closed,
    setHighlightedIndex: store.highlight,
    choose: store.choose,
    insert: store.insert,
    dismiss: store.dismiss,
    textFor: store.textFor,
    onKeyDown: store.keydown,
    getListProps: <P extends object = object>(props?: P) => mergeProps({ "aria-label": labels.suggestions }, props, store.getListProps()) as P & ListProps,
    getOptionProps: <P extends object = object>(index: number, props?: P) =>
      mergeProps(props, store.getOptionProps(index), {
        // mousedown, not click: keeps focus and the caret in the editor
        onMouseDown: (event: React.MouseEvent) => {
          event.preventDefault();
          store.choose(index);
        },
        onPointerMove: () => store.highlight(index),
      }) as P & OptionProps & OptionHandlers,
  };
}
