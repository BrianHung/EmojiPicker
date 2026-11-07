"use client";

import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { createEmojiSuggestions, type EmojiSelection, type EmojiSuggestionsMachine, type EmojiSuggestionsOptions, type EmojiTrigger, type KeyLike, type ShortcodeCompletion } from "@brianhung/emoji-picker-core";
import { useEmojiStatus } from "../provider/hooks";
import { useEmojiContext } from "../provider/provider";
import { useLatest, useStableCallback } from "../utils/latest";
import { useStore } from "../utils/store";
import { elementOf, useLayoutEffect } from "../utils/utils";

export type EmojiTypeaheadOptions = Pick<EmojiSuggestionsOptions, "limit" | "matchBy" | "order" | "columns" | "onSelect"> & {
  insert?: "emoji" | "shortcode";
};

type OptionHandlers = {
  onMouseDown: (event: React.MouseEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
};

type Snapshot = ReturnType<EmojiSuggestionsMachine["getSnapshot"]>;
type ListProps = ReturnType<EmojiSuggestionsMachine["getListProps"]>;
type OptionProps = ReturnType<EmojiSuggestionsMachine["getOptionProps"]>;

export type EmojiTypeahead = {
  query: string;
  open: boolean;
  anchor: () => DOMRect | null;
  suggestions: Snapshot & {
    setHighlightedIndex: (index: number) => void;
    choose(index?: number): void;
    insert(selection: EmojiSelection): void;
    dismiss(): void;
    textFor(suggestion: ShortcodeCompletion, insert?: "emoji" | "shortcode"): string;
    onKeyDown(event: KeyLike): boolean;
    getListProps<P extends object = object>(props?: P): P & ListProps;
    getOptionProps<P extends object = object>(index: number, props?: P): P & OptionProps & OptionHandlers;
  };
  dismiss(): void;
  onKeyDown(event: KeyLike): boolean;
};

type TypeaheadElement = HTMLElement | React.RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined) | null;

const closed = () => null;

const targetOf = (element: TypeaheadElement | undefined): HTMLElement | null => (typeof element === "function" ? (element() ?? null) : elementOf(element));

const isMachine = (source: EmojiTrigger | EmojiSuggestionsMachine | null): source is EmojiSuggestionsMachine => typeof (source as EmojiSuggestionsMachine | null)?.subscribe === "function";

// One machine for the component's life; values sync in a layout effect keyed on them, and callbacks are read at call time
function useOwnMachine({ limit, matchBy, order, columns, onSelect }: EmojiTypeaheadOptions, query: string, onChoose: (suggestion: ShortcodeCompletion) => void): EmojiSuggestionsMachine {
  const { store } = useEmojiContext();
  const id = React.useId();
  const choose = useStableCallback(onChoose);
  const select = useStableCallback((selection: EmojiSelection) => onSelect?.(selection));
  const [machine] = React.useState(() => createEmojiSuggestions(store, { query, limit, matchBy, order, columns, id, onChoose: choose, onSelect: select }));
  useLayoutEffect(() => machine.setOptions({ query, limit, matchBy, order, columns, id, onChoose: choose, onSelect: select }), [machine, query, limit, matchBy, order, columns, id, choose, select]);
  return machine;
}

function useSuggestions(machine: EmojiSuggestionsMachine): EmojiTypeahead["suggestions"] {
  useEmojiStatus();
  const snapshot = useStore(machine);
  return {
    ...snapshot,
    setHighlightedIndex: machine.highlight,
    choose: machine.choose,
    insert: machine.insert,
    dismiss: machine.dismiss,
    textFor: machine.textFor,
    onKeyDown: machine.keydown,
    getListProps: <P extends object = object>(props?: P) => mergeProps(props, machine.getListProps()) as P & ListProps,
    getOptionProps: <P extends object = object>(index: number, props?: P) =>
      mergeProps(props, machine.getOptionProps(index), {
        // mousedown, not click: keeps focus and the caret in the editor
        onMouseDown: (event: React.MouseEvent) => {
          event.preventDefault();
          machine.choose(index);
        },
        onPointerMove: () => machine.highlight(index),
      }) as P & OptionProps & OptionHandlers,
  };
}

export function useEmojiTypeahead(trigger: EmojiTrigger | null, options?: EmojiTypeaheadOptions, element?: TypeaheadElement): EmojiTypeahead;
export function useEmojiTypeahead(suggestions: EmojiSuggestionsMachine, options: { anchor: () => DOMRect | null }): EmojiTypeahead;
export function useEmojiTypeahead(source: EmojiTrigger | EmojiSuggestionsMachine | null, options: EmojiTypeaheadOptions & { anchor?: () => DOMRect | null } = {}, element?: TypeaheadElement): EmojiTypeahead {
  const trigger = isMachine(source) ? null : source;
  const own = useOwnMachine(options, trigger?.query ?? "", (s) => trigger?.replace(own.textFor(s, options.insert ?? "emoji"), s));
  const machine = isMachine(source) ? source : own;
  const suggestions = useSuggestions(machine);
  const { open } = suggestions;
  const target = useLatest(element);
  React.useEffect(() => {
    const el = open ? targetOf(target.current) : null;
    if (!el) return;
    el.addEventListener("blur", machine.dismiss);
    const unsync = machine.syncCombobox(el);
    return () => {
      el.removeEventListener("blur", machine.dismiss);
      unsync();
    };
  }, [open, machine, target]);
  return { query: suggestions.query, open, anchor: options.anchor ?? trigger?.anchor ?? closed, suggestions, dismiss: suggestions.dismiss, onKeyDown: suggestions.onKeyDown };
}
