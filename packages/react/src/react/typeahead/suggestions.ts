import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import {
  createEmojiSuggestions,
  type EmojiSelection,
  type EmojiSuggestionsMachine,
  type EmojiSuggestionsSnapshot,
  type KeyLike,
  type ShortcodeCompletion,
  type SuggestionsListProps,
  type SuggestionsOptionProps,
  type SuggestionsOptions,
} from "@brianhung/emoji-picker-core";
import { useEmojiStatus } from "../provider/hooks";
import { useEmojiContext } from "../provider/provider";
import { useStableCallback } from "../utils/latest";
import { useStore } from "../utils/store";
import { useLayoutEffect } from "../utils/utils";

export type { KeyLike };

export type EmojiSuggestionsOptions = Omit<SuggestionsOptions, "id" | "query"> & {
  query: string;
};

type OptionHandlers = {
  onMouseDown: (event: React.MouseEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
};

export type EmojiSuggestionsState = EmojiSuggestionsSnapshot & {
  setHighlightedIndex: (index: number) => void;
  choose(index?: number): void;
  insert(selection: EmojiSelection): void;
  dismiss(): void;
  textFor(suggestion: ShortcodeCompletion, insert?: "emoji" | "shortcode"): string;
  onKeyDown(event: KeyLike): boolean;
  getListProps<P extends object = object>(props?: P): P & SuggestionsListProps;
  getOptionProps<P extends object = object>(index: number, props?: P): P & SuggestionsOptionProps & OptionHandlers;
};

// One machine for the component's life; values sync in a layout effect keyed on them, and callbacks are read at call time
export function useSuggestionsMachine({ query, resetKey, limit, matchBy, order, columns, onChoose, onSelect, onDismiss }: EmojiSuggestionsOptions): EmojiSuggestionsMachine {
  const { store } = useEmojiContext();
  const id = React.useId();
  const choose = useStableCallback((suggestion: ShortcodeCompletion) => onChoose?.(suggestion));
  const select = useStableCallback((selection: EmojiSelection) => onSelect?.(selection));
  const dismiss = useStableCallback(() => onDismiss?.());
  const [machine] = React.useState(() => createEmojiSuggestions(store, { query, resetKey, limit, matchBy, order, columns, id, onChoose: choose, onSelect: select, onDismiss: dismiss }));
  useLayoutEffect(
    () => machine.setOptions({ query, resetKey, limit, matchBy, order, columns, id, onChoose: choose, onSelect: select, onDismiss: dismiss }),
    [machine, query, resetKey, limit, matchBy, order, columns, id, choose, select, dismiss],
  );
  return machine;
}

export const useEmojiSuggestions = (options: EmojiSuggestionsOptions): EmojiSuggestionsState => useSuggestionsStore(useSuggestionsMachine(options));

export function useSuggestionsStore(machine: EmojiSuggestionsMachine): EmojiSuggestionsState {
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
    getListProps: <P extends object = object>(props?: P) => mergeProps(props, machine.getListProps()) as P & SuggestionsListProps,
    getOptionProps: <P extends object = object>(index: number, props?: P) =>
      mergeProps(props, machine.getOptionProps(index), {
        // mousedown, not click: keeps focus and the caret in the editor
        onMouseDown: (event: React.MouseEvent) => {
          event.preventDefault();
          machine.choose(index);
        },
        onPointerMove: () => machine.highlight(index),
      }) as P & SuggestionsOptionProps & OptionHandlers,
  };
}
