import * as React from "react";
import { createEmojiSuggestions, type EmojiSelection, type EmojiSuggestionsMachine, type KeyLike, type ShortcodeCompletion, type SuggestionsOptions, type SuggestionsSnapshot } from "@brianhung/emoji-picker-core";
import { useEmojiStatus } from "../provider/hooks";
import { useStore } from "../utils/store";
import { useEmojiContext } from "../provider/provider";

export type ShortcodeSuggestion = ShortcodeCompletion;

export type { KeyLike };

export type EmojiSuggestionsOptions = Omit<SuggestionsOptions, "id" | "query"> & {
  query: string;
};

export type EmojiSuggestionsState = SuggestionsSnapshot & {
  setHighlightedIndex: (index: number) => void;
  choose(index?: number): void;
  insert(selection: EmojiSelection): void;
  dismiss(): void;
  textFor(suggestion: ShortcodeSuggestion, insert?: "emoji" | "shortcode"): string;
  onKeyDown(event: KeyLike): boolean;
  getListProps(): { id: string; role: "listbox" };
  getOptionProps(index: number): ReturnType<EmojiSuggestionsMachine["getOptionProps"]> & {
    onMouseDown: (event: React.MouseEvent) => void;
    onPointerMove: () => void;
  };
};

export function useSuggestionsMachine(options: EmojiSuggestionsOptions): EmojiSuggestionsMachine {
  const { store } = useEmojiContext();
  const id = React.useId();
  const [machine] = React.useState(() => createEmojiSuggestions(store, { ...options, id }));
  machine.setOptions({ ...options, id });
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
    getListProps: machine.getListProps,
    getOptionProps: (index) => ({
      ...machine.getOptionProps(index),
      // mousedown, not click: keeps focus and the caret in the editor
      onMouseDown: (event) => {
        event.preventDefault();
        machine.choose(index);
      },
      onPointerMove: () => machine.highlight(index),
    }),
  };
}
